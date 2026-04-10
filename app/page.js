"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    brands: 0,
    products: 0,
    soldOut: 0,
    needsReview: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [brandsRes, productsRes, soldOutRes, reviewRes] = await Promise.all(
        [
          supabase.from("brands").select("id", { count: "exact", head: true }),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("sold_out", true),
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("needs_review", true),
        ]
      );
      setStats({
        brands: brandsRes.count || 0,
        products: productsRes.count || 0,
        soldOut: soldOutRes.count || 0,
        needsReview: reviewRes.count || 0,
      });
    }
    loadStats();
  }, []);

  const cards = [
    { label: "品牌數量", value: stats.brands, color: "text-purple-400" },
    { label: "產品數量", value: stats.products, color: "text-blue-400" },
    { label: "已售完", value: stats.soldOut, color: "text-red-400" },
    { label: "待審核", value: stats.needsReview, color: "text-yellow-400" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <p className="text-gray-400 text-sm">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
