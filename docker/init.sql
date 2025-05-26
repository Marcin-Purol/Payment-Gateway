CREATE DATABASE IF NOT EXISTS payment_gateway;
USE payment_gateway;

CREATE TABLE IF NOT EXISTS merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  service_id VARCHAR(255) NOT NULL UNIQUE,
  token VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  title VARCHAR(255) NOT NULL,
  customer_first_name VARCHAR(255) NOT NULL,
  customer_last_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  status ENUM('Pending', 'Cancelled', 'Success', 'Failed') NOT NULL,
  payment_link_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES shops(service_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT IGNORE INTO roles (name) VALUES ('Reprezentant');
INSERT IGNORE INTO roles (name) VALUES ('Techniczna');
INSERT IGNORE INTO roles (name) VALUES ('Finansowa');

DELIMITER $$

CREATE PROCEDURE create_merchant_and_user_and_shop(
  IN p_first_name VARCHAR(255),
  IN p_last_name VARCHAR(255),
  IN p_email VARCHAR(255),
  IN p_password VARCHAR(255),
  IN p_test_shop_name VARCHAR(255),
  IN p_test_service_id VARCHAR(255),
  IN p_test_token VARCHAR(255)
)
BEGIN
  DECLARE new_merchant_id INT;
  DECLARE new_user_id INT;
  DECLARE role_id INT;

  INSERT INTO merchants (first_name, last_name, email, password)
    VALUES (p_first_name, p_last_name, p_email, p_password);
  SET new_merchant_id = LAST_INSERT_ID();

  INSERT INTO users (merchant_id, first_name, last_name, email, password)
    VALUES (new_merchant_id, p_first_name, p_last_name, p_email, p_password);
  SET new_user_id = LAST_INSERT_ID();

  INSERT INTO shops (merchant_id, service_id, token, name)
    VALUES (new_merchant_id, p_test_service_id, p_test_token, p_test_shop_name);

  SELECT id INTO role_id FROM roles WHERE name = 'Reprezentant' LIMIT 1;
  IF role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (new_user_id, role_id);
  END IF;

  SELECT new_merchant_id AS merchantId, new_user_id AS userId;
END $$

CREATE PROCEDURE create_user_and_roles(
  IN p_merchant_id INT,
  IN p_first_name VARCHAR(255),
  IN p_last_name VARCHAR(255),
  IN p_email VARCHAR(255),
  IN p_password VARCHAR(255),
  IN p_roles TEXT
)
BEGIN
  DECLARE new_user_id INT;
  DECLARE next_role VARCHAR(255);
  DECLARE comma_pos INT;

  INSERT INTO users (merchant_id, first_name, last_name, email, password)
    VALUES (p_merchant_id, p_first_name, p_last_name, p_email, p_password);
  SET new_user_id = LAST_INSERT_ID();

  WHILE LENGTH(p_roles) > 0 DO
    SET comma_pos = LOCATE(',', p_roles);
    IF comma_pos > 0 THEN
      SET next_role = SUBSTRING(p_roles, 1, comma_pos - 1);
      SET p_roles = SUBSTRING(p_roles, comma_pos + 1);
    ELSE
      SET next_role = p_roles;
      SET p_roles = '';
    END IF;
    INSERT INTO user_roles (user_id, role_id)
      SELECT new_user_id, id FROM roles WHERE name = next_role;
  END WHILE;
END $$

CREATE PROCEDURE create_shop(
  IN p_merchant_id INT,
  IN p_service_id VARCHAR(255),
  IN p_token VARCHAR(255),
  IN p_name VARCHAR(255)
)
BEGIN
  INSERT INTO shops (merchant_id, service_id, token, name)
    VALUES (p_merchant_id, p_service_id, p_token, p_name);
END $$

CREATE PROCEDURE deactivate_shop(
  IN p_service_id VARCHAR(255)
)
BEGIN
  UPDATE shops SET active = FALSE WHERE service_id = p_service_id;
END $$

CREATE PROCEDURE delete_user_and_roles(
  IN p_user_id INT
)
BEGIN
  DELETE FROM user_roles WHERE user_id = p_user_id;
  DELETE FROM users WHERE id = p_user_id;
END $$

CREATE PROCEDURE update_user_and_roles(
  IN p_user_id INT,
  IN p_first_name VARCHAR(255),
  IN p_last_name VARCHAR(255),
  IN p_email VARCHAR(255),
  IN p_password VARCHAR(255),
  IN p_roles TEXT
)
BEGIN
  DECLARE next_role VARCHAR(255);
  DECLARE comma_pos INT;

  UPDATE users
    SET first_name = p_first_name,
        last_name = p_last_name,
        email = p_email,
        password = p_password
    WHERE id = p_user_id;

  DELETE FROM user_roles WHERE user_id = p_user_id;

  WHILE LENGTH(p_roles) > 0 DO
    SET comma_pos = LOCATE(',', p_roles);
    IF comma_pos > 0 THEN
      SET next_role = SUBSTRING(p_roles, 1, comma_pos - 1);
      SET p_roles = SUBSTRING(p_roles, comma_pos + 1);
    ELSE
      SET next_role = p_roles;
      SET p_roles = '';
    END IF;
    INSERT INTO user_roles (user_id, role_id)
      SELECT p_user_id, id FROM roles WHERE name = next_role;
  END WHILE;
END $$

CREATE PROCEDURE update_transaction_status(
  IN p_transaction_id INT,
  IN p_status VARCHAR(32)
)
BEGIN
  UPDATE transactions SET status = p_status WHERE id = p_transaction_id;
END $$

DELIMITER ;