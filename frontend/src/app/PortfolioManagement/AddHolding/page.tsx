"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddHoldingRedirect() {
	const router = useRouter();
	useEffect(() => { router.replace("/PortfolioManagement/Portfolio/Holdings"); }, [router]);
	return null;
}