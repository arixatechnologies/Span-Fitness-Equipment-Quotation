alter table public.quotations
add column if not exists excel_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quotation-excels',
  'quotation-excels',
  false,
  20971520,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.save_quotation_transaction(
  p_quotation_id uuid,
  p_customer_id uuid,
  p_customer_payload jsonb,
  p_quotation_payload jsonb,
  p_items jsonb,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_quotation_id uuid;
  saved_customer_id uuid;
  customer_record public.customers%rowtype;
  saved_customer_snapshot jsonb;
  base_number text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one quotation item is required';
  end if;

  if p_customer_id is not null then
    select *
    into customer_record
    from public.customers
    where id = p_customer_id;

    if not found then
      raise exception 'Customer not found';
    end if;

    saved_customer_id := customer_record.id;
    saved_customer_snapshot := to_jsonb(customer_record);
  else
    if p_customer_payload is null then
      raise exception 'Customer details are required';
    end if;

    insert into public.customers (
      customer_name,
      business_name,
      phone,
      suffix,
      alternate_phone,
      email,
      gst_number,
      address,
      city,
      state,
      pincode,
      notes
    )
    values (
      p_customer_payload->>'customer_name',
      nullif(p_customer_payload->>'business_name', ''),
      p_customer_payload->>'phone',
      nullif(p_customer_payload->>'suffix', ''),
      nullif(p_customer_payload->>'alternate_phone', ''),
      nullif(p_customer_payload->>'email', ''),
      nullif(p_customer_payload->>'gst_number', ''),
      nullif(p_customer_payload->>'address', ''),
      nullif(p_customer_payload->>'city', ''),
      nullif(p_customer_payload->>'state', ''),
      nullif(p_customer_payload->>'pincode', ''),
      nullif(p_customer_payload->>'notes', '')
    )
    returning * into customer_record;

    saved_customer_id := customer_record.id;
    saved_customer_snapshot := to_jsonb(customer_record);
  end if;

  if p_quotation_id is null then
    base_number := public.next_quotation_base_number(
      (p_quotation_payload->>'quote_date')::date
    );

    insert into public.quotations (
      base_quote_number,
      revision,
      quote_number,
      quote_date,
      validity_days,
      customer_id,
      customer_snapshot,
      total_list_price,
      discount_amount,
      total_special_price,
      gst_amount,
      net_total,
      round_off,
      grand_total,
      gst_mode,
      terms,
      payment_terms,
      transportation_note,
      delivery_note,
      warranty_note,
      after_sales_support,
      bank_details,
      company_settings_snapshot,
      prepared_by,
      status,
      created_by
    )
    values (
      base_number,
      0,
      base_number,
      (p_quotation_payload->>'quote_date')::date,
      (p_quotation_payload->>'validity_days')::integer,
      saved_customer_id,
      saved_customer_snapshot,
      (p_quotation_payload->>'total_list_price')::numeric,
      (p_quotation_payload->>'discount_amount')::numeric,
      (p_quotation_payload->>'total_special_price')::numeric,
      (p_quotation_payload->>'gst_amount')::numeric,
      (p_quotation_payload->>'net_total')::numeric,
      (p_quotation_payload->>'round_off')::numeric,
      (p_quotation_payload->>'grand_total')::numeric,
      p_quotation_payload->>'gst_mode',
      p_quotation_payload->>'terms',
      p_quotation_payload->>'payment_terms',
      p_quotation_payload->>'transportation_note',
      p_quotation_payload->>'delivery_note',
      p_quotation_payload->>'warranty_note',
      p_quotation_payload->>'after_sales_support',
      p_quotation_payload->'bank_details',
      p_quotation_payload->'company_settings_snapshot',
      p_quotation_payload->>'prepared_by',
      p_quotation_payload->>'status',
      p_created_by
    )
    returning id into saved_quotation_id;
  else
    update public.quotations
    set
      quote_date = (p_quotation_payload->>'quote_date')::date,
      validity_days = (p_quotation_payload->>'validity_days')::integer,
      customer_id = saved_customer_id,
      customer_snapshot = saved_customer_snapshot,
      total_list_price = (p_quotation_payload->>'total_list_price')::numeric,
      discount_amount = (p_quotation_payload->>'discount_amount')::numeric,
      total_special_price = (p_quotation_payload->>'total_special_price')::numeric,
      gst_amount = (p_quotation_payload->>'gst_amount')::numeric,
      net_total = (p_quotation_payload->>'net_total')::numeric,
      round_off = (p_quotation_payload->>'round_off')::numeric,
      grand_total = (p_quotation_payload->>'grand_total')::numeric,
      gst_mode = p_quotation_payload->>'gst_mode',
      terms = p_quotation_payload->>'terms',
      payment_terms = p_quotation_payload->>'payment_terms',
      transportation_note = p_quotation_payload->>'transportation_note',
      delivery_note = p_quotation_payload->>'delivery_note',
      warranty_note = p_quotation_payload->>'warranty_note',
      after_sales_support = p_quotation_payload->>'after_sales_support',
      bank_details = p_quotation_payload->'bank_details',
      company_settings_snapshot = p_quotation_payload->'company_settings_snapshot',
      prepared_by = p_quotation_payload->>'prepared_by',
      status = p_quotation_payload->>'status',
      pdf_url = null,
      pdf_path = null,
      excel_path = null
    where id = p_quotation_id
    returning id into saved_quotation_id;

    if saved_quotation_id is null then
      raise exception 'Quotation not found';
    end if;

    delete from public.quotation_items
    where quotation_id = saved_quotation_id;

    delete from public.pdf_files
    where quotation_id = saved_quotation_id;
  end if;

  insert into public.quotation_items (
    quotation_id,
    product_id,
    sku,
    product_name,
    brand_name,
    image_url,
    description,
    specifications,
    dimensions,
    machine_weight,
    stack_weight,
    unit_price,
    special_price,
    qty,
    gst_percent,
    list_total,
    special_total,
    gst_amount,
    line_total
  )
  select
    saved_quotation_id,
    item.product_id,
    item.sku,
    item.product_name,
    item.brand_name,
    item.image_url,
    item.description,
    item.specifications,
    item.dimensions,
    item.machine_weight,
    item.stack_weight,
    item.unit_price,
    item.special_price,
    item.qty,
    item.gst_percent,
    item.list_total,
    item.special_total,
    item.gst_amount,
    item.line_total
  from jsonb_to_recordset(p_items) as item (
    product_id uuid,
    sku text,
    product_name text,
    brand_name text,
    image_url text,
    description text,
    specifications text,
    dimensions text,
    machine_weight text,
    stack_weight text,
    unit_price numeric,
    special_price numeric,
    qty numeric,
    gst_percent numeric,
    list_total numeric,
    special_total numeric,
    gst_amount numeric,
    line_total numeric
  );

  return saved_quotation_id;
end;
$$;

create or replace function public.create_quotation_revision_transaction(
  p_source_quotation_id uuid,
  p_created_by text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_quotation public.quotations%rowtype;
  next_revision integer;
  new_quotation_id uuid;
begin
  select *
  into source_quotation
  from public.quotations
  where id = p_source_quotation_id;

  if not found then
    raise exception 'Quotation not found';
  end if;

  if not exists (
    select 1
    from public.quotation_items
    where quotation_id = p_source_quotation_id
  ) then
    raise exception 'Quotation has no items';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(source_quotation.base_quote_number, 0));

  select coalesce(max(revision), 0) + 1
  into next_revision
  from public.quotations
  where base_quote_number = source_quotation.base_quote_number;

  insert into public.quotations (
    base_quote_number,
    revision,
    quote_number,
    quote_date,
    validity_days,
    customer_id,
    customer_snapshot,
    total_list_price,
    discount_amount,
    total_special_price,
    gst_amount,
    net_total,
    round_off,
    grand_total,
    gst_mode,
    terms,
    payment_terms,
    transportation_note,
    delivery_note,
    warranty_note,
    after_sales_support,
    bank_details,
    company_settings_snapshot,
    prepared_by,
    status,
    created_by
  )
  values (
    source_quotation.base_quote_number,
    next_revision,
    concat(source_quotation.base_quote_number, '-R', next_revision),
    current_date,
    source_quotation.validity_days,
    source_quotation.customer_id,
    source_quotation.customer_snapshot,
    source_quotation.total_list_price,
    source_quotation.discount_amount,
    source_quotation.total_special_price,
    source_quotation.gst_amount,
    source_quotation.net_total,
    source_quotation.round_off,
    source_quotation.grand_total,
    source_quotation.gst_mode,
    source_quotation.terms,
    source_quotation.payment_terms,
    source_quotation.transportation_note,
    source_quotation.delivery_note,
    source_quotation.warranty_note,
    source_quotation.after_sales_support,
    source_quotation.bank_details,
    source_quotation.company_settings_snapshot,
    source_quotation.prepared_by,
    'Draft',
    p_created_by
  )
  returning id into new_quotation_id;

  insert into public.quotation_items (
    quotation_id,
    product_id,
    sku,
    product_name,
    brand_name,
    image_url,
    description,
    specifications,
    dimensions,
    machine_weight,
    stack_weight,
    unit_price,
    special_price,
    qty,
    gst_percent,
    list_total,
    special_total,
    gst_amount,
    line_total
  )
  select
    new_quotation_id,
    product_id,
    sku,
    product_name,
    brand_name,
    image_url,
    description,
    specifications,
    dimensions,
    machine_weight,
    stack_weight,
    unit_price,
    special_price,
    qty,
    gst_percent,
    list_total,
    special_total,
    gst_amount,
    line_total
  from public.quotation_items
  where quotation_id = p_source_quotation_id
  order by created_at;

  return new_quotation_id;
end;
$$;

revoke all on function public.save_quotation_transaction(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated;

revoke all on function public.create_quotation_revision_transaction(uuid, text)
from public, anon, authenticated;

grant execute on function public.save_quotation_transaction(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text
) to service_role;

grant execute on function public.create_quotation_revision_transaction(uuid, text)
to service_role;
