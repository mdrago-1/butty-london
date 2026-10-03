-- Fuller Canva juice menu (Set Butty Juice Menu) and breakfast/lunch windows.
-- Sandwiches are not rewritten. Shop flags are not touched.

update menu_items
set avail_from = 7.5, avail_to = 11.5
where section = 'Breakfast Butties';

update menu_items
set avail_from = 11.5, avail_to = 16
where section = 'Lunch Specials';

delete from menu_items where section = 'Juices & Drinks';

insert into menu_items (
  id, section, name, description, price, avail_from, avail_to,
  sold_out, veg, allergens, removable, extras, sort_order, photo
) values
('dr-green','Juices & Drinks','Green Giant','Apples, cucumber, celery, lemon, olive oil, ice',6.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',10,'/menu/placeholder.jpg'),
('dr-bugs','Juices & Drinks','Bugs Bunny','Carrot, apple, ginger, olive oil, ice',6.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',20,'/menu/placeholder.jpg'),
('dr-beet','Juices & Drinks','Up the Beet','Beetroot, cucumber, black pepper, ice, olive oil',7.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',30,'/menu/placeholder.jpg'),
('dr-orange','Juices & Drinks','Orange Juice','Freshly pressed orange juice, ice',5.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',40,'/menu/placeholder.jpg'),
('dr-cycling','Juices & Drinks','Cycling Watts','Coconut water, lemon, spinach, apple',7.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',50,'/menu/placeholder.jpg'),
('dr-kale','Juices & Drinks','Kale Kicker','Kale, Spinach, apple, ginger, olive oil, ice',7.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',60,'/menu/placeholder.jpg'),
('dr-winter','Juices & Drinks','Winter Prep','Carrot, orange, turmeric, ginger, lemon, olive oil, ice',7.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',70,'/menu/placeholder.jpg'),
('dr-iron','Juices & Drinks','Iron Man','Kiwi, strawberry, apple, olive oil, ice',7.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',80,'/menu/placeholder.jpg'),
('dr-passion','Juices & Drinks','Passion Lava','Passionfruit, apple, pineapple, collagen, ice, olive oil',8.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',90,'/menu/placeholder.jpg'),
('dr-cacao','Juices & Drinks','Go-Cacao-Go','Raw Cacao, banana, date puree, collagen & whey protein, oat, ice',8.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',100,'/menu/placeholder.jpg'),
('dr-muscle','Juices & Drinks','Muscle Up','Avocado, spinach, coconut water, whey protein, olive oil, ice',8.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',110,'/menu/placeholder.jpg'),
('dr-berry','Juices & Drinks','Berry Sunny','Strawberries, mango, banana, apple, ice',8.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',120,'/menu/placeholder.jpg'),
('dr-forest','Juices & Drinks','Forest Fruits','Raspberries, blueberries, strawberries, banana, apple, ice',8.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',130,'/menu/placeholder.jpg'),
('dr-nutty','Juices & Drinks','Nutty','Peanut butter, banana, oat drink, cacao, ice',8.00,8,17,false,false,'[]','[]','[{"n":"Whey protein","p":2.5},{"n":"Collagen","p":2.5},{"n":"Vanilla","p":1.5}]',140,'/menu/placeholder.jpg'),
('dr-bullet','Juices & Drinks','Bullet Proof','Espresso, butter, coconut oil',4.50,8,17,false,false,'[]','[]','[]',150,'/menu/placeholder.jpg'),
('dr-caplatte','Juices & Drinks','Cappuccino / Latte','',4.50,8,17,false,false,'[]','[]','[]',160,'/menu/placeholder.jpg'),
('dr-flat','Juices & Drinks','Flat White','',3.80,8,17,false,false,'[]','[]','[]',170,'/menu/placeholder.jpg'),
('dr-cortado','Juices & Drinks','Cortado','',3.20,8,17,false,false,'[]','[]','[]',180,'/menu/placeholder.jpg'),
('dr-espresso','Juices & Drinks','Espresso','',3.00,8,17,false,false,'[]','[]','[]',190,'/menu/placeholder.jpg'),
('dr-matcha','Juices & Drinks','Matcha Latte','',5.50,8,17,false,false,'[]','[]','[]',200,'/menu/placeholder.jpg'),
('dr-choc','Juices & Drinks','Hot Chocolate','',4.90,8,17,false,false,'[]','[]','[]',210,'/menu/placeholder.jpg'),
('dr-chai','Juices & Drinks','Chai Latte','',5.50,8,17,false,false,'[]','[]','[]',220,'/menu/placeholder.jpg'),
('dr-tea','Juices & Drinks','English Tea','',3.50,8,17,false,false,'[]','[]','[]',230,'/menu/placeholder.jpg'),
('dr-earl','Juices & Drinks','Earl Grey','',3.50,8,17,false,false,'[]','[]','[]',240,'/menu/placeholder.jpg');
