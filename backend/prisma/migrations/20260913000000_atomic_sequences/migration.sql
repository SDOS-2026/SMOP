CREATE TABLE "sequence_counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sequence_counters_pkey" PRIMARY KEY ("key")
);

-- Bootstrap counters from production data so the first generated number after
-- deployment cannot collide with an existing document number.
INSERT INTO "sequence_counters" ("key", "value")
SELECT regexp_replace(document_no, '-[0-9]+$', ''), MAX(substring(document_no from '([0-9]+)$')::integer)
FROM (
    SELECT "po_number" AS document_no FROM "purchase_orders"
    UNION ALL SELECT "enquiry_no" FROM "supplier_enquiries"
    UNION ALL SELECT "quotation_no" FROM "supplier_quotations"
    UNION ALL SELECT "receipt_no" FROM "material_receipts"
    UNION ALL SELECT "inspection_no" FROM "material_inspections"
    UNION ALL SELECT "batch_number" FROM "material_batches"
    UNION ALL SELECT "enquiry_no" FROM "customer_enquiries"
    UNION ALL SELECT "quotation_no" FROM "customer_quotations"
    UNION ALL SELECT "order_no" FROM "customer_orders"
    UNION ALL SELECT "order_no" FROM "production_orders"
) documents
WHERE document_no ~ '^[A-Za-z]+-[0-9]{4}-[0-9]+$'
GROUP BY regexp_replace(document_no, '-[0-9]+$', '')
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST("sequence_counters"."value", EXCLUDED."value");
