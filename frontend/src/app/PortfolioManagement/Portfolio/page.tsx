import { redirect } from "next/navigation";

export default function PortfolioIndexRedirect() {
  redirect("/PortfolioManagement/Portfolio/Plan");
  return null;
}
