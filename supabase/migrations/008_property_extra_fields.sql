-- Add APN, terms & conditions, buyer premium, and doc fee to properties
alter table properties add column apn text not null default '';
alter table properties add column terms_and_conditions text not null default '';
alter table properties add column buyer_premium numeric not null default 0;
alter table properties add column doc_fee numeric not null default 0;
