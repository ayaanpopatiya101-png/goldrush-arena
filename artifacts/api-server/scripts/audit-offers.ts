import { revenueCatGet } from '../src/lib/revenueCatProvider.js';
// Read-only audit: never creates products, prices, transactions or campaigns.
const projects = await revenueCatGet('/v2/projects?limit=100');
for (const project of projects.items ?? []) {
  const base = `/v2/projects/${encodeURIComponent(project.id)}`;
  const products = await revenueCatGet(`${base}/products?limit=100`);
  const offerings = await revenueCatGet(`${base}/offerings?limit=100`);
  console.log(JSON.stringify({
    project: { id: project.id, name: project.name },
    products: products.items?.map((p: any) => ({
      id: p.id, storeIdentifier: p.store_identifier, appId: p.app_id, type: p.type, state: p.state,
      indicativePrice: p.indicative_price, oneTime: p.one_time,
    })),
    offerings: offerings.items?.map((o: any) => ({ id: o.id, lookupKey: o.lookup_key, current: o.is_current, state: o.state })),
  }, null, 2));
  const apps = await revenueCatGet(`${base}/apps?limit=100`);
  console.log(JSON.stringify({ apps: apps.items?.map((a: any) => ({ id: a.id, name: a.name, type: a.type })) }, null, 2));
}
