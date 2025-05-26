export interface Transaction {
  id: number;
  amount: number;
  currency: string;
  description: string;
  status: "Pending" | "Success" | "Failed";
}
