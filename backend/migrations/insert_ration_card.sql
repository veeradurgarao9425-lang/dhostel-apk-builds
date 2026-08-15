INSERT INTO id_proof_types (code, name, regex_pattern, min_length, max_length, display_order) VALUES
('RATION', 'Ration Card', '^[A-Z0-9]{8,15}$', 8, 15, 6)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);
