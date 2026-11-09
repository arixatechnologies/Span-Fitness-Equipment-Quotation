update public.quotation_items
set line_total = special_total
where line_total is distinct from special_total;

create or replace function public.normalize_quotation_item_gst_split()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  quotation_gst_mode text;
  quotation_gst_type text;
begin
  select gst_mode, gst_type
  into quotation_gst_mode, quotation_gst_type
  from public.quotations
  where id = new.quotation_id;

  new.line_total := new.special_total;

  if quotation_gst_mode = 'included' then
    new.taxable_value := new.special_total - new.gst_amount;
  else
    new.taxable_value := new.special_total;
  end if;

  if quotation_gst_type = 'cgst_sgst' then
    new.cgst_amount := round(new.gst_amount / 2, 2);
    new.sgst_amount := new.gst_amount - new.cgst_amount;
    new.igst_amount := 0;
  elsif quotation_gst_type = 'igst' then
    new.cgst_amount := 0;
    new.sgst_amount := 0;
    new.igst_amount := new.gst_amount;
  else
    new.cgst_amount := 0;
    new.sgst_amount := 0;
    new.igst_amount := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists quotation_items_normalize_gst_split on public.quotation_items;
create trigger quotation_items_normalize_gst_split
before insert or update of quotation_id, special_total, line_total, gst_amount, taxable_value,
  cgst_amount, sgst_amount, igst_amount
on public.quotation_items
for each row execute function public.normalize_quotation_item_gst_split();
