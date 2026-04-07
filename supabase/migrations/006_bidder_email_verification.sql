-- Email confirmation before bidding (new registrations must verify; existing rows grandfathered)
alter table bidders add column if not exists email_verified_at timestamptz;
alter table bidders add column if not exists email_verification_token text;
alter table bidders add column if not exists email_verification_expires_at timestamptz;
alter table bidders add column if not exists email_verification_sent_at timestamptz;

update bidders
set email_verified_at = coalesce(created_at, now())
where email_verified_at is null;
