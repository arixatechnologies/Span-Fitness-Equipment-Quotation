insert into public.company_settings (
  company_name,
  gst_number,
  phone_numbers,
  email,
  address,
  bank_name,
  bank_account_no,
  bank_branch,
  bank_ifsc,
  default_terms,
  default_warranty,
  default_delivery,
  default_transportation,
  default_payment_terms,
  default_after_sales_support,
  authorized_person_name,
  authorized_person_designation,
  brand_footer_heading
)
select
  'SPAN FITNESS EQUIPMENTS',
  '37EHKPK9679G1ZH',
  '9703344483 | 9840639509',
  'spanfitnessequipments@gmail.com',
  'GROUND FLOOR, 50-81-26, SEETHAMMAPETA JUNCTION, MAIN ROAD, Visakhapatnam - 530016.',
  'HDFC Bank',
  '50200062043280',
  'Vishakhapatnam',
  'HDFC0006274',
  'The prices are valid only for 30 days.',
  'One year comprehensive warranty for parts and labor. Warranty does not cover plastic, rubber parts, upholstery, and physical damages. Treadmill warranty will be covered only on use of stabilizer.',
  'As per stock availability.',
  'Transportation charges extra. Unloading charges should be arranged by customer.',
  '100% advance payment along with purchase order.',
  'Dedicated service support within 24 hours of complaint registration.',
  'Authorized Signatory',
  'For SPAN FITNESS EQUIPMENTS',
  'ASSOCIATED FITNESS BRANDS'
where not exists (select 1 from public.company_settings);

insert into public.brands (name, slug)
values
  ('Span', 'span'),
  ('Maxpro', 'maxpro'),
  ('Firm', 'firm'),
  ('Reebok', 'reebok')
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
values
  ('Strength', 'strength', null),
  ('Cardio', 'cardio', null),
  ('Free Weights', 'free-weights', null),
  ('Benches', 'benches', null),
  ('Accessories', 'accessories', null)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select 'Selectorized Machines', 'selectorized-machines', id from public.categories where slug = 'strength'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select 'Commercial Cardio', 'commercial-cardio', id from public.categories where slug = 'cardio'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select 'Bars and Plates', 'bars-and-plates', id from public.categories where slug = 'free-weights'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id)
select 'Utility Benches', 'utility-benches', id from public.categories where slug = 'benches'
on conflict (slug) do nothing;

insert into public.brand_footer_logos (label, sort_order)
values
  ('SPAN FITNESS EQUIPMENTS', 1),
  ('Maxpro', 2),
  ('Firm', 3),
  ('Reebok', 4),
  ('Span', 5)
on conflict do nothing;

insert into public.products (
  sku,
  product_name,
  brand_id,
  category_id,
  sub_category_id,
  unit_price,
  special_price,
  gst_percent,
  stock_availability,
  description,
  technical_specifications,
  dimensions,
  machine_weight,
  stack_weight,
  warranty_note,
  status
)
values
  (
    'SFE-ST-001',
    'Leg Curl / Leg Extension',
    (select id from public.brands where slug = 'span'),
    (select id from public.categories where slug = 'strength'),
    (select id from public.categories where slug = 'selectorized-machines'),
    148000,
    129000,
    18,
    'In Stock',
    'Dual-function lower body machine for leg extension and seated leg curl training.',
    'Adjustable roller pads, compact commercial frame, precision pulley movement.',
    '1450 x 1100 x 1600 mm',
    '210 kg',
    '80 kg',
    'One year comprehensive warranty as per company terms.',
    'active'
  ),
  (
    'SFE-ST-002',
    'Multi Press',
    (select id from public.brands where slug = 'span'),
    (select id from public.categories where slug = 'strength'),
    (select id from public.categories where slug = 'selectorized-machines'),
    172000,
    149000,
    18,
    'In Stock',
    'Multi-angle press station for chest, shoulder, and incline press movements.',
    'Adjustable seat, multi-grip handles, heavy-duty frame with smooth cable path.',
    '1680 x 1320 x 1760 mm',
    '245 kg',
    '90 kg',
    'One year comprehensive warranty as per company terms.',
    'active'
  ),
  (
    'SFE-ST-003',
    'Multi Bench Press',
    (select id from public.brands where slug = 'maxpro'),
    (select id from public.categories where slug = 'benches'),
    (select id from public.categories where slug = 'utility-benches'),
    62000,
    54000,
    18,
    'Limited Stock',
    'Adjustable bench press suitable for flat, incline, and decline workouts.',
    'Commercial upholstery, wide back pad, multiple incline positions.',
    '1500 x 620 x 1250 mm',
    '68 kg',
    null,
    'One year comprehensive warranty as per company terms.',
    'active'
  ),
  (
    'SFE-ST-004',
    'Lat Pull Down',
    (select id from public.brands where slug = 'span'),
    (select id from public.categories where slug = 'strength'),
    (select id from public.categories where slug = 'selectorized-machines'),
    138000,
    121000,
    18,
    'In Stock',
    'Commercial lat pull down machine for back and shoulder training.',
    'Thigh hold-down pads, lat bar attachment, selectorized weight stack.',
    '1560 x 1140 x 2200 mm',
    '230 kg',
    '90 kg',
    'One year comprehensive warranty as per company terms.',
    'active'
  ),
  (
    'SFE-ST-005',
    'Pull Up Bar',
    (select id from public.brands where slug = 'span'),
    (select id from public.categories where slug = 'accessories'),
    null,
    18500,
    15500,
    18,
    'In Stock',
    'Wall-mounted pull up station for bodyweight strength training.',
    'Multi-grip handles, reinforced wall mounting plates, powder-coated frame.',
    '1200 x 650 x 420 mm',
    '24 kg',
    null,
    'One year warranty against manufacturing defects.',
    'active'
  ),
  (
    'SFE-FW-001',
    'Dumbbell Set',
    (select id from public.brands where slug = 'firm'),
    (select id from public.categories where slug = 'free-weights'),
    (select id from public.categories where slug = 'bars-and-plates'),
    98000,
    87500,
    18,
    'In Stock',
    'Rubber-coated dumbbell set for commercial gym strength area.',
    'Pairs from 2.5 kg to 25 kg, knurled handles, rack optional.',
    'Assorted',
    '275 kg set',
    null,
    'Warranty does not cover rubber wear and physical damage.',
    'active'
  ),
  (
    'SFE-FW-002',
    'Rubber Weight Plate Set',
    (select id from public.brands where slug = 'firm'),
    (select id from public.categories where slug = 'free-weights'),
    (select id from public.categories where slug = 'bars-and-plates'),
    72000,
    64000,
    18,
    'In Stock',
    'Tri-grip rubber Olympic plate set for commercial lifting zones.',
    'Includes assorted 2.5 kg, 5 kg, 10 kg, 15 kg, 20 kg, and 25 kg plates.',
    'Olympic 50 mm bore',
    '300 kg set',
    null,
    'Warranty does not cover rubber wear and physical damage.',
    'active'
  ),
  (
    'SFE-FW-003',
    'Olympic Bar',
    (select id from public.brands where slug = 'firm'),
    (select id from public.categories where slug = 'free-weights'),
    (select id from public.categories where slug = 'bars-and-plates'),
    21000,
    18500,
    18,
    'In Stock',
    'Commercial 7 ft Olympic barbell for strength and power training.',
    '20 kg bar, rotating sleeves, standard 50 mm Olympic loading.',
    '2200 mm length',
    '20 kg',
    null,
    'Warranty against manufacturing defects only.',
    'active'
  ),
  (
    'SFE-BN-001',
    'Flat Bench',
    (select id from public.brands where slug = 'span'),
    (select id from public.categories where slug = 'benches'),
    (select id from public.categories where slug = 'utility-benches'),
    24000,
    20500,
    18,
    'In Stock',
    'Stable flat utility bench for dumbbell and free weight workouts.',
    'High-density foam pad, anti-slip foot caps, commercial steel frame.',
    '1250 x 560 x 450 mm',
    '32 kg',
    null,
    'One year warranty against manufacturing defects.',
    'active'
  ),
  (
    'SFE-CD-001',
    'Treadmill',
    (select id from public.brands where slug = 'reebok'),
    (select id from public.categories where slug = 'cardio'),
    (select id from public.categories where slug = 'commercial-cardio'),
    245000,
    218000,
    18,
    'On Order',
    'Commercial treadmill for cardio zones and fitness centers.',
    'AC motor, wide running belt, incline control, console with programs.',
    '2120 x 890 x 1550 mm',
    '185 kg',
    null,
    'Treadmill warranty will be covered only on use of stabilizer.',
    'active'
  ),
  (
    'SFE-CD-002',
    'Cross Trainer',
    (select id from public.brands where slug = 'span'),
    (select id from public.categories where slug = 'cardio'),
    (select id from public.categories where slug = 'commercial-cardio'),
    188000,
    166000,
    18,
    'Limited Stock',
    'Front-drive elliptical cross trainer for low-impact cardio training.',
    'Multiple resistance levels, moving handles, console feedback.',
    '1960 x 720 x 1720 mm',
    '128 kg',
    null,
    'One year comprehensive warranty as per company terms.',
    'active'
  ),
  (
    'SFE-HG-001',
    'Home Gym',
    (select id from public.brands where slug = 'maxpro'),
    (select id from public.categories where slug = 'strength'),
    (select id from public.categories where slug = 'selectorized-machines'),
    118000,
    99000,
    18,
    'In Stock',
    'Compact multi-station home gym for residential and studio use.',
    'Chest press, pec deck, lat pull down, low row, leg developer.',
    '1650 x 1100 x 2050 mm',
    '168 kg',
    '70 kg',
    'One year comprehensive warranty as per company terms.',
    'active'
  )
on conflict (sku) do nothing;
