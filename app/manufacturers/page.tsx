"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MANUFACTURERS as FALLBACK_MANUFACTURERS } from "@/app/estimate/_data/constants";
import { supabase } from "@/lib/supabase";
import { ManufacturerCard } from "./_components/ManufacturerCard";

interface Manufacturer {
  id: number;
  name: string;
  location: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo: string;
}

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManufacturers = async () => {
      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name, location, rating, description, tags, products, image, logo")
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        setManufacturers(data as Manufacturer[]);
      } else {
        setManufacturers(FALLBACK_MANUFACTURERS);
      }
      setLoading(false);
    };

    void fetchManufacturers();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <Loader2 className="h-10 w-10 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9fafb] px-6 py-24 md:py-40">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">제조사 목록</h1>
          <p className="mt-3 text-lg font-medium text-slate-500">두고 커넥트가 검증한 글로벌 파트너 제조사입니다.</p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {manufacturers.length > 0 ? (
            manufacturers.map((item) => <ManufacturerCard key={item.id} {...item} />)
          ) : (
            <div className="col-span-full py-20 text-center font-medium text-slate-400">등록된 제조사가 없습니다.</div>
          )}
        </div>
      </div>
    </main>
  );
}
