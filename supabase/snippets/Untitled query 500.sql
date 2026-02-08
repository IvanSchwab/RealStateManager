SELECT id, start_date, end_date, rent_amount, payment_due_day
FROM contracts
WHERE status = 'activo'