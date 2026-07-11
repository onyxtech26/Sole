TRUNCATE audit_log, travellers, tour_groups, bookings, product_options, guides, products, admins RESTART IDENTITY CASCADE;

INSERT INTO admins (email,name,password_hash) VALUES
('admin@sole.demo','Admin','$2b$10$j7PB0wFKinkGcRh0Dl6cFeE/1bdddIqk6tswbn.awF5aDCInG0DIO'),
('ops@sole.demo','Operations','$2b$10$j7PB0wFKinkGcRh0Dl6cFeE/1bdddIqk6tswbn.awF5aDCInG0DIO');

INSERT INTO products (name,short_name,viator_code,sort_order) VALUES
('Guided Tour of Colosseum, Roman Forum & Palatine Hill in Rome','Colosseo guide','5524558P1',1),
('Private guided Tour of Colosseum, Roman Forum & Palatine Hill','Private Colosseo','5524558P4',2),
('Guided Tour for Vatican Museum and Sistin Chapel','Vatican Museums','5524558P3',3),
('Rome Highlights by Golf Cart Tour','Golf Cart','5524558P2',4),
('Discover North Cyprus: Private Famagusta Tour','Famagusta','5524558P10',5),
('Rome Photo Shoot in Rome with Professional Photographer','Photo Shoot','5524558P18',6),
('Private Guided Walking Tour of Rome''s City Highlights','Rome Highlights','5524558P19',7);

INSERT INTO product_options (product_id,code,name,capacity,sort_order) VALUES
(1,'TG1','Colosseo guide',7,1),
(1,'TG2','Semi-Private Colosseo',7,2),
(1,'TG3','Just Colosseo',24,3),
(2,'TG1','Private Colosseo',24,1);

INSERT INTO guides (name) VALUES
('Felice'),
('Carlo Maria'),
('Susanna'),
('Orietta'),
('Liliana'),
('Elizabetta'),
('Giovanni'),
('Maria Teresa'),
('Rossella'),
('Antonello');

INSERT INTO bookings (reference,source,product_id,product_option_id,service_date,start_time,meeting_point,phone,language,amount_cents,status,received_date,created_by,updated_by) VALUES
('BR-1414100001','Viator',1,1,'2026-07-12','09:00','Colosseo Metro, green kiosk','+1 555 0101','English',15691,'Confirmed','2026-07-09',1,1),
('BR-1414100002','Viator',1,1,'2026-07-12','10:00','Colosseo Metro, green kiosk','+1 555 0102','English',10074,'Confirmed','2026-07-09',1,1),
('BR-1414100003','Viator',1,1,'2026-07-12','09:00','Colosseo Metro, green kiosk','+1 555 0103','English',46656,'Confirmed','2026-07-09',1,1),
('BR-1414100004','Viator',1,2,'2026-07-12','09:00','Colosseo Metro, green kiosk','+1 555 0104','English',49304,'Confirmed','2026-07-09',1,1),
('BR-1414100005','Viator',1,1,'2026-07-12','10:00','Colosseo Metro, green kiosk','+1 555 0105','Portuguese',24455,'Confirmed','2026-07-09',1,1),
('BR-1414100006','Viator',2,4,'2026-07-12','09:00','Colosseo Metro, green kiosk','+1 555 0106','English',46300,'Confirmed','2026-07-09',1,1);

INSERT INTO tour_groups (service_date,product_id,product_option_id,guide_id,departure_time,ticket_time,ticket_status,sort_order) VALUES
('2026-07-12',1,1,1,'09:00','09:30','Ticket done 9:30',1),
('2026-07-12',1,1,2,'09:00','09:45','Ticket done 9:45',2);

INSERT INTO travellers (booking_id,group_id,first_name,last_name,type,is_lead,gross_cents,sort_order) VALUES
(1,2,'Gus','Aldridge','Adult',true,6052,0),
(1,2,'Lena','Jansen','Adult',false,6052,1),
(1,2,'Hana','Jansen','Child',false,3587,2),
(2,2,'Mo','Hensley','Adult',true,5037,0),
(2,2,'Pia','Deering','Adult',false,5037,1),
(3,1,'Kit','Fairbank','Adult',true,5832,0),
(3,1,'Gus','Fairbank','Adult',false,5832,1),
(3,1,'Otto','Fairbank','Adult',false,5832,2),
(3,1,'Bea','Fairbank','Adult',false,5832,3),
(3,1,'Dana','Fairbank','Adult',false,5832,4),
(3,1,'Alex','Fairbank','Adult',false,5832,5),
(3,2,'Sam','Bramley','Adult',false,5832,6),
(3,2,'Lena','Bramley','Adult',false,5832,7),
(4,NULL,'Ivo','Castellan','Adult',true,9122,0),
(4,NULL,'Sam','Castellan','Adult',false,9122,1),
(4,NULL,'Cai','Castellan','Adult',false,9122,2),
(4,NULL,'Emil','Castellan','Adult',false,9122,3),
(4,NULL,'Otto','Castellan','Child',false,6408,4),
(4,NULL,'Nia','Castellan','Child',false,6408,5),
(5,NULL,'Quin','Ibarra','Adult',true,5767,0),
(5,NULL,'Dana','Jansen','Adult',false,5767,1),
(5,NULL,'Emil','Eastwood','Adult',false,5767,2),
(5,NULL,'Alex','Hensley','Child',false,3577,3),
(5,NULL,'Alex','Aldridge','Child',false,3577,4),
(6,NULL,'Dana','Castellan','Adult',true,12650,0),
(6,NULL,'Fern','Castellan','Adult',false,12650,1),
(6,NULL,'Alex','Castellan','Child',false,7000,2),
(6,NULL,'Ivo','Castellan','Child',false,7000,3),
(6,NULL,'Bea','Castellan','Child',false,7000,4);