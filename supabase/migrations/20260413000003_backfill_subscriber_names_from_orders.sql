-- Backfill name and email on organic subscribers from their order records
UPDATE subscribers s
SET
  name  = o.customer_name,
  email = o.customer_email
FROM (
  SELECT DISTINCT ON (customer_phone)
    customer_phone,
    customer_name,
    customer_email
  FROM orders
  WHERE customer_phone IS NOT NULL
  ORDER BY customer_phone, created_at DESC
) o
WHERE s.phone    = o.customer_phone
  AND s.source   = 'organic'
  AND s.name     IS NULL
  AND s.email    IS NULL;
