"use client";

import { useEffect, useState } from "react";

type Option = { id: number; code: string; name: string; capacity: number };
type Product = { id: number; name: string; shortName: string; viatorCode: string; active: boolean; options: Option[] };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">CATALOGUE</p>
          <h1>Products</h1>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="content-stack">
          {products.map((p) => (
            <div className="panel" key={p.id}>
              <div className="panel-heading">
                <span>{p.shortName || p.name}</span>
                <span className="muted tnum" style={{ fontWeight: 400 }}>{p.viatorCode}</span>
              </div>
              <div style={{ padding: "8px 18px 14px" }}>
                <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{p.name}</p>
                {p.options.length > 0 ? (
                  <table>
                    <thead><tr><th>Grade</th><th>Sub-product</th><th>Capacity</th></tr></thead>
                    <tbody>
                      {p.options.map((o) => (
                        <tr key={o.id}>
                          <td className="tnum">{o.code}</td>
                          <td>{o.name}</td>
                          <td className="tnum">up to {o.capacity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted" style={{ fontSize: 12 }}>No sub-products (tour grades) yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
