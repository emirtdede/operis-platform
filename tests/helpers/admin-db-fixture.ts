export interface FixtureOptions {
  users?: Array<Record<string, unknown>>;
  listings?: Array<Record<string, unknown>>;
  offers?: Array<Record<string, unknown>>;
  reports?: Array<Record<string, unknown>>;
  engagements?: Array<Record<string, unknown>>;
  securityEvents?: Array<Record<string, unknown>>;
  ipBlocks?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  deadLettersCount?: number;
  openReportsCount?: number;
  activeThreatsCount?: number;
}

export function createAdminDbFixture(options: FixtureOptions = {}) {
  const users = options.users ?? [];
  const listings = options.listings ?? [];
  const offers = options.offers ?? [];
  const reports = options.reports ?? [];
  const engagements = options.engagements ?? [];
  const securityEvents = options.securityEvents ?? [];
  const ipBlocks = options.ipBlocks ?? [];
  const profiles = options.profiles ?? [
    {
      userId: "usr_mock_demir",
      displayName: "Demir Yıldız",
      handle: "demiryildiz",
    },
    {
      userId: "usr_mock_suspended",
      displayName: "Askıya Alınmış Kullanıcı",
      handle: "suspendeduser",
    },
  ];
  const deadLettersCount = options.deadLettersCount ?? 0;
  const openReportsCount = options.openReportsCount ?? reports.length;
  const activeThreatsCount = options.activeThreatsCount ?? securityEvents.length;

  const getTableName = (target: unknown): string => {
    if (!target) return "";
    if (typeof target === "object") {
      const sym = Object.getOwnPropertySymbols(target);
      for (const s of sym) {
        if (s.description === "drizzle:Name" || s.description?.includes("Name")) {
          return String((target as Record<symbol, unknown>)[s]);
        }
      }
      if ("_name" in (target as Record<string, unknown>)) {
        return String((target as Record<string, unknown>)._name);
      }
      if ("name" in (target as Record<string, unknown>)) {
        return String((target as Record<string, unknown>).name);
      }
    }
    return "";
  };

  const createSelectChain = (fields: unknown) => {
    let currentTable: unknown = null;
    let limitVal: number | null = null;
    let offsetVal: number | null = null;
    const whereConditions: unknown[] = [];

    const chain: Record<string, unknown> = {
      from: (table: unknown) => {
        currentTable = table;
        return chain;
      },
      leftJoin: () => chain,
      innerJoin: () => chain,
      where: (cond: unknown) => {
        whereConditions.push(cond);
        return chain;
      },
      limit: (lim: number) => {
        limitVal = lim;
        return chain;
      },
      offset: (off: number) => {
        offsetVal = off;
        return chain;
      },
      orderBy: () => chain,
      then: (resolve: (data: unknown[]) => void) => {
        const tableName = getTableName(currentTable);
        const isCount =
          fields && typeof fields === "object" && "val" in (fields as Record<string, unknown>);

        if (isCount) {
          if (tableName.includes("user")) {
            return resolve([{ val: users.length }]);
          }
          if (tableName.includes("listing")) {
            return resolve([{ val: listings.length }]);
          }
          if (tableName.includes("offer")) {
            return resolve([{ val: offers.length }]);
          }
          if (tableName.includes("engagement")) {
            return resolve([{ val: engagements.length }]);
          }
          if (tableName.includes("report")) {
            return resolve([{ val: openReportsCount }]);
          }
          if (tableName.includes("outbox")) {
            return resolve([{ val: deadLettersCount }]);
          }
          if (tableName.includes("security")) {
            return resolve([{ val: activeThreatsCount }]);
          }
          if (tableName.includes("ip_block")) {
            return resolve([{ val: ipBlocks.length }]);
          }
          return resolve([{ val: 0 }]);
        }

        // Return row data based on table and requested fields
        if (tableName.includes("listing")) {
          // Check if selecting joined shape { listing, profile, category, ... }
          if (
            fields &&
            typeof fields === "object" &&
            "listing" in (fields as Record<string, unknown>)
          ) {
            const mapped = listings.map((l) => ({
              listing: l,
              profile: profiles.find((p) => p.userId === l.ownerUserId) || {
                displayName: l.ownerDisplayName || "Demir Yıldız",
                handle: l.ownerHandle || "demiryildiz",
              },
              category: { key: l.categoryKey || "web-development" },
              categoryTranslation: { name: l.categoryName || "Web Geliştirme" },
            }));
            const offset = offsetVal || 0;
            const limit = limitVal !== null ? limitVal : mapped.length;
            return resolve(mapped.slice(offset, offset + limit));
          }
          const offset = offsetVal || 0;
          const limit = limitVal !== null ? limitVal : listings.length;
          return resolve(listings.slice(offset, offset + limit));
        }

        if (tableName.includes("offer")) {
          if (
            fields &&
            typeof fields === "object" &&
            "offer" in (fields as Record<string, unknown>)
          ) {
            const mapped = offers.map((o) => ({
              offer: {
                ...o,
                offerorUserId: o.senderUserId || "usr_mock_demir",
              },
              listing: listings.find((l) => l.id === o.listingId) ||
                listings[0] || {
                  id: o.listingId || "list_sample_01",
                  title: o.listingTitle || "Next.js & Supabase SaaS Geliştirme",
                  slug: o.listingSlug || "nextjs-supabase-saas",
                  ownerUserId: o.recipientUserId || "usr_mock_suspended",
                },
            }));
            const offset = offsetVal || 0;
            const limit = limitVal !== null ? limitVal : mapped.length;
            return resolve(mapped.slice(offset, offset + limit));
          }
          const offset = offsetVal || 0;
          const limit = limitVal !== null ? limitVal : offers.length;
          return resolve(offers.slice(offset, offset + limit));
        }

        if (tableName.includes("profile")) {
          return resolve(profiles);
        }

        let dataset: Array<Record<string, unknown>> = [];
        if (tableName.includes("user")) {
          dataset = [...users];
        } else if (tableName.includes("engagement")) {
          dataset = [...engagements];
        } else if (tableName.includes("report")) {
          dataset = [...reports];
        } else if (tableName.includes("security")) {
          dataset = [...securityEvents];
        } else if (tableName.includes("ip_block")) {
          dataset = [...ipBlocks];
        }

        const offset = offsetVal || 0;
        const limit = limitVal !== null ? limitVal : dataset.length;
        return resolve(dataset.slice(offset, offset + limit));
      },
    };

    return chain;
  };

  const createUpdateChain = (table: unknown) => {
    let updateValues: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {
      set: (values: Record<string, unknown>) => {
        updateValues = values;
        return chain;
      },
      where: () => chain,
      returning: () => ({
        then: (resolve: (val: unknown[]) => void) => {
          const tableName = getTableName(table);
          if (tableName.includes("listing")) {
            const first = listings[0] || {};
            return resolve([{ ...first, ...updateValues }]);
          }
          if (tableName.includes("report")) {
            const first = reports[0] || {};
            return resolve([{ ...first, ...updateValues }]);
          }
          if (tableName.includes("ip_block")) {
            const first = ipBlocks[0] || {};
            return resolve([{ ...first, ...updateValues }]);
          }
          return resolve([{ ...updateValues }]);
        },
      }),
      then: (resolve: (val: unknown[]) => void) => resolve([]),
    };
    return chain;
  };

  const createInsertChain = (_table: unknown) => {
    let insertValues: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {
      values: (val: Record<string, unknown>) => {
        insertValues = val;
        return chain;
      },
      onConflictDoNothing: () => chain,
      onConflictDoUpdate: () => chain,
      returning: () => ({
        then: (resolve: (val: unknown[]) => void) => {
          return resolve([{ id: "inserted_test_id", count: 1, ...insertValues }]);
        },
      }),
      then: (resolve: (val: unknown[]) => void) =>
        resolve([{ id: "inserted_test_id", count: 1, ...insertValues }]),
    };
    return chain;
  };

  const createDeleteChain = () => {
    const chain: Record<string, unknown> = {
      where: () => chain,
      returning: () => ({
        then: (resolve: (val: unknown[]) => void) => resolve([{ id: "deleted_test_id" }]),
      }),
      then: (resolve: (val: unknown[]) => void) => resolve([]),
    };
    return chain;
  };

  return {
    select: (fields?: unknown) => createSelectChain(fields),
    update: (table: unknown) => createUpdateChain(table),
    insert: (table: unknown) => createInsertChain(table),
    delete: (_table: unknown) => createDeleteChain(),
    transaction: async (cb: (tx: unknown) => unknown) => {
      const mockTx = {
        select: (fields?: unknown) => createSelectChain(fields),
        update: (table: unknown) => createUpdateChain(table),
        insert: (table: unknown) => createInsertChain(table),
        delete: (_table: unknown) => createDeleteChain(),
      };
      return cb(mockTx);
    },
  };
}
