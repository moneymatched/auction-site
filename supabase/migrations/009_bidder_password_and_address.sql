-- Add password hash and home address to bidders
alter table bidders add column if not exists password_hash text;
alter table bidders add column if not exists address_street text;
alter table bidders add column if not exists address_city text;
alter table bidders add column if not exists address_state text;
alter table bidders add column if not exists address_zip text;
