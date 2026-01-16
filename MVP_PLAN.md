# Farm Management System - MVP Plan

## Scope

| Feature | MVP | Future |
|---------|-----|--------|
| Breed | Holstein-Friesian only | Jersey, MRIJ |
| Cow tracking | Group averages | Individual cows |
| Farm | Single farm | Multi-farm |
| MPR integration | ❌ Manual input | Auto-import |
| Robot integration | ❌ | Lely/DeLaval |

---

## MVP Database Schema

### Table 1: `farms`
```sql
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'Mijn Bedrijf',
    owner_user_id UUID,  -- Optional, for future auth
    herd_size INT DEFAULT 100,
    milk_price_per_kg DECIMAL(4,2) DEFAULT 0.42,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table 2: `herd_groups`
```sql
CREATE TABLE herd_groups (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., 'Hoogproductief', 'Laagproductief'
    
    -- Group size
    cow_count INT NOT NULL DEFAULT 50,
    
    -- Average characteristics
    life_stage VARCHAR(20) DEFAULT 'lactating',  -- 'lactating', 'dry', 'youngstock'
    avg_parity DECIMAL(3,1) DEFAULT 2.5,
    avg_weight_kg DECIMAL(5,1) DEFAULT 675.0,
    avg_days_in_milk INT DEFAULT 150,
    avg_days_pregnant INT DEFAULT 0,
    grazing_type VARCHAR(20) DEFAULT 'none',  -- 'none', 'partial', 'full'
    
    -- Production targets
    avg_milk_yield_kg DECIMAL(4,1) DEFAULT 30.0,
    avg_fat_percent DECIMAL(4,2) DEFAULT 4.40,
    avg_protein_percent DECIMAL(4,2) DEFAULT 3.50,
    
    -- Calculated targets (cached)
    fpcm_daily DECIMAL(5,2),
    vem_target INT,
    dve_target INT,
    voc_limit DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table 3: `inventory_tracking`
```sql
CREATE TABLE inventory_tracking (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id) ON DELETE CASCADE,
    
    -- Stock levels
    current_stock_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
    silo_capacity_kg DECIMAL(12,2),
    
    -- Usage (calculated from rations)
    daily_usage_rate_kg DECIMAL(8,2) DEFAULT 0,
    
    -- Tracking
    last_delivery_date DATE,
    last_delivery_kg DECIMAL(10,2),
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(farm_id, feed_id)
);
```

### Table 4: `group_rations`
```sql
CREATE TABLE group_rations (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES herd_groups(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id),
    
    -- Amount per cow per day
    amount_kg_ds DECIMAL(6,3) NOT NULL,
    
    -- Feeding method
    feeding_method VARCHAR(20) DEFAULT 'mixer',  -- 'mixer', 'station'
    
    -- Order in loading list
    load_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(group_id, feed_id)
);
```

---

## MVP API Endpoints

### Farms
- `GET /api/farms` - Get current farm
- `PUT /api/farms/:id` - Update farm settings

### Herd Groups
- `GET /api/groups` - List all groups for farm
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/calculate` - Calculate VEM/DVE/VOC targets

### Inventory
- `GET /api/inventory` - Get all inventory for farm
- `PUT /api/inventory/:feedId` - Update stock level
- `POST /api/inventory/delivery` - Record delivery

### Rations
- `GET /api/groups/:id/ration` - Get ration for group
- `PUT /api/groups/:id/ration` - Save ration for group

### Logistics
- `GET /api/loading-list` - Generate loading list for all groups
- `GET /api/order-advice` - Generate order advice

---

## MVP UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Groepen     │  │ Voorraad    │  │ Laadlijst   │          │
│  │ beheren     │  │ beheren     │  │ genereren   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ GROEPEN       │  │ VOORRAAD      │  │ UITVOERING    │
│               │  │               │  │               │
│ • Hoogprod.   │  │ • Graskuil    │  │ • Laadlijst   │
│ • Laagprod.   │  │ • Maïskuil    │  │ • Besteladvies│
│ • Droog       │  │ • Krachtvoer  │  │ • Voersaldo   │
│               │  │               │  │               │
│ [+ Groep]     │  │ [+ Levering]  │  │ [📄 Export]   │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                  ┌───────────────┐
                  │ RANTSOEN      │
                  │ CALCULATOR    │
                  │ (bestaand)    │
                  └───────────────┘
```

---

## Implementation Steps

### Phase 1: Database (Today)
1. Create `farms` table
2. Create `herd_groups` table
3. Create `inventory_tracking` table
4. Create `group_rations` table
5. Insert default farm and groups

### Phase 2: API (Today/Tomorrow)
1. Add tRPC routers for new entities
2. Implement CRUD operations
3. Add calculation endpoints

### Phase 3: UI - Groups (Tomorrow)
1. Create GroupManagement page
2. Group list with CRUD
3. Group detail form

### Phase 4: UI - Inventory (Day 3)
1. Inventory overview page
2. Stock level editing
3. Delivery recording
4. Days remaining display

### Phase 5: UI - Logistics (Day 4)
1. Loading list generator
2. Order advice generator
3. Voersaldo calculation
4. PDF export

### Phase 6: Integration (Day 5)
1. Connect groups to existing calculator
2. Update dashboard
3. Testing
4. Deploy

---

## Estimated Timeline

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Database + API | Schema live, endpoints working |
| 2 | Groups UI | Group management page |
| 3 | Inventory UI | Inventory tracking page |
| 4 | Logistics UI | Loading list + orders |
| 5 | Integration | Full MVP working |

**Total: 5 days for MVP**

---

## Success Criteria

- [ ] User can create/edit herd groups
- [ ] User can track feed inventory
- [ ] System calculates days remaining per feed
- [ ] System generates loading list for mixer wagon
- [ ] System generates order advice
- [ ] System shows voersaldo per group
