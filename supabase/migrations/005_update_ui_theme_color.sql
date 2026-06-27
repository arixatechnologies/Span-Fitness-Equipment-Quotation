update public.company_settings
set pdf_theme_color = '#93B5C6'
where pdf_theme_color = '#101A33';

alter table public.company_settings
alter column pdf_theme_color set default '#93B5C6';
