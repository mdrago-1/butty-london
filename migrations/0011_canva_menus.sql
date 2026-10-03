-- Replace menu_items with the approved Canva breakfast, lunch, and juice menus.
-- Breakfast and lunch Lupo / Salmon stay as separate rows.
-- Does not touch shop_settings (online orders, specials, renovating).

delete from menu_items;

insert into menu_items (
  id, section, name, description, price, avail_from, avail_to,
  sold_out, veg, allergens, removable, extras, sort_order, photo
) values
('bf-bacon','Breakfast Butties','Bacon Butty','Dry Smoked Back Bacon, Chilli & Tomato Relish on White Cob',5.00,8,11,false,false,'[]','[]','[]',10,'/menu/placeholder.jpg'),
('bf-builders','Breakfast Butties','Builders Butty','Dry Smoked Back Bacon, Pete''s Sausage, on White Cob',6.00,8,11,false,false,'[]','[]','[]',20,'/menu/placeholder.jpg'),
('bf-lupo','Breakfast Butties','Lupo Butty','Avocado, Feta, EVOO, pickled red chilli, pumpkin Seeds & Pine Kernels on ciabatta',5.00,8,11,false,true,'[]','[]','[]',30,'/menu/placeholder.jpg'),
('bf-greek','Breakfast Butties','Greek Butty','Halloumi, Avocado, Spinach Vine Tomato, EVOO on Ciabatta',8.00,8,11,false,true,'[]','[]','[]',40,'/menu/placeholder.jpg'),
('bf-parma','Breakfast Butties','Parma Butty','Parma Ham, Mozzarella Bufala, Vine Tomato, Pesto on Ciabatta',7.00,8,11,false,false,'[]','[]','[]',50,'/menu/placeholder.jpg'),
('bf-salmon','Breakfast Butties','Salmon Butty','Smoked Salmon, Creamed Cheese, lemon, Dill on Bagel',8.00,8,11,false,false,'[]','[]','[]',60,'/menu/placeholder.jpg'),
('lu-fat','Lunch Specials','Fat Butty','Slow Roast Pulled Pork, Apple Slaw, Grated Pecorino on ciabatta',10.00,11,14,false,false,'[]','[]','[]',10,'/menu/placeholder.jpg'),
('lu-tony','Lunch Specials','Big Tony Butty','Mortadella, prosciutto crudo, rocket, pesto on ciabatta',11.00,11,14,false,false,'[]','[]','[]',20,'/menu/placeholder.jpg'),
('lu-lupo','Lunch Specials','Lupo Butty','Avocado, Feta, EVOO, pumpkin seeds, Pine Kernels, pickled chilli on ciabatta',8.00,11,14,false,true,'[]','[]','[]',30,'/menu/placeholder.jpg'),
('lu-cheeky','Lunch Specials','Cheeky Butty','Baked Chicken thigh, sriracha hot sauce, Little Gem, on ciabatta',8.00,11,14,false,false,'[]','[]','[]',40,'/menu/placeholder.jpg'),
('lu-humous','Lunch Specials','Humous Butty','Roast peppers, roast courgettes, humous, evoo on ciabatta',8.00,11,14,false,true,'[]','[]','[]',50,'/menu/placeholder.jpg'),
('lu-salmon','Lunch Specials','Salmon Butty','Smoked Salmon, Creamed Cheese, Black Pepper, Dill on bagel',8.00,11,14,false,false,'[]','[]','[]',60,'/menu/placeholder.jpg'),
('dr-green','Juices & Drinks','Green Giant','Apples, cucumber, celery, lemon, ice',5.00,8,17,false,false,'[]','[]','[]',10,'/menu/placeholder.jpg'),
('dr-bugs','Juices & Drinks','Bugs Bunny','Carrots, apples, ginger, ice',5.00,8,17,false,false,'[]','[]','[]',20,'/menu/placeholder.jpg'),
('dr-passion','Juices & Drinks','Passion Lava','Passionfruit, pineapple, apple, ice, olive oil',5.00,8,17,false,false,'[]','[]','[]',30,'/menu/placeholder.jpg'),
('dr-beet','Juices & Drinks','Up the Beet','Beetroot, cucumber, black pepper, ice, olive oil',5.00,8,17,false,false,'[]','[]','[]',40,'/menu/placeholder.jpg'),
('dr-muscle','Juices & Drinks','Muscle Up','Avocado, spinach, oat, whey protein, olive oil, ice',5.00,8,17,false,false,'[]','[]','[]',50,'/menu/placeholder.jpg'),
('dr-berry','Juices & Drinks','Berry Sunny','Strawberries, blueberries, banana, apple juice',5.00,8,17,false,false,'[]','[]','[]',60,'/menu/placeholder.jpg'),
('dr-nutty','Juices & Drinks','Nutty','Peanut butter, banana, oat, cacao, ice',5.00,8,17,false,false,'[]','[]','[]',70,'/menu/placeholder.jpg'),
('dr-bullet','Juices & Drinks','Bullet Proof','Espresso, butter, coconut oil',5.00,8,17,false,false,'[]','[]','[]',80,'/menu/placeholder.jpg'),
('dr-flat','Juices & Drinks','Flat White','',3.80,8,17,false,false,'[]','[]','[]',90,'/menu/placeholder.jpg'),
('dr-cortado','Juices & Drinks','Cortado','',3.20,8,17,false,false,'[]','[]','[]',100,'/menu/placeholder.jpg'),
('dr-espresso','Juices & Drinks','Espresso','',3.00,8,17,false,false,'[]','[]','[]',110,'/menu/placeholder.jpg'),
('dr-caplatte','Juices & Drinks','Cappuccino / Latte','',4.50,8,17,false,false,'[]','[]','[]',120,'/menu/placeholder.jpg');
