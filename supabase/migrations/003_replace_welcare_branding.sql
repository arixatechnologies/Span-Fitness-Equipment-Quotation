update public.brand_footer_logos
set
  label = 'SPAN FITNESS EQUIPMENTS',
  image_url = null
where label ilike '%welcare%';

insert into public.brand_footer_logos (label, sort_order)
select 'SPAN FITNESS EQUIPMENTS', 1
where not exists (
  select 1
  from public.brand_footer_logos
  where lower(label) = lower('SPAN FITNESS EQUIPMENTS')
);

update public.products
set brand_id = span_brand.id
from public.brands old_brand
cross join public.brands span_brand
where public.products.brand_id = old_brand.id
  and old_brand.slug = 'welcare'
  and span_brand.slug = 'span';

update public.quotation_items
set brand_name = 'SPAN FITNESS EQUIPMENTS'
where brand_name ilike '%welcare%';

update public.brands
set is_active = false
where slug = 'welcare';
