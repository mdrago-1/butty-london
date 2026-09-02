-- Butty & Co. — menu, shop switches, and click-and-collect tickets.
-- Unowned rows (no accounts): ticket_name is the name called at the counter,
-- not a customer record. No phone/email stored.

create table if not exists menu_items (
  id           text primary key,
  section      text not null,
  name         text not null,
  description  text not null default '',
  price        numeric(6,2) not null,
  avail_from   numeric(4,2) not null default 8,
  avail_to     numeric(4,2) not null default 17,
  sold_out     boolean not null default false,
  veg          boolean not null default false,
  allergens    jsonb not null default '[]',
  removable    jsonb not null default '[]',
  extras       jsonb not null default '[]',
  sort_order   int not null default 0
);

create table if not exists shop_settings (
  id             int primary key default 1,
  online_orders  boolean not null default true,
  specials_on    boolean not null default true,
  updated_at     timestamptz not null default now(),
  constraint shop_settings_one_row check (id = 1)
);

insert into shop_settings (id) values (1) on conflict (id) do nothing;

create table if not exists orders (
  id            text primary key,
  order_no      int not null,
  ticket_name   text not null,
  collect_time  text not null default 'asap',
  stage         int not null default 0,
  collected     boolean not null default false,
  collected_at  timestamptz,
  paid          boolean not null default false,
  amount_total  numeric(7,2) not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists order_lines (
  id          serial primary key,
  order_id    text not null references orders(id) on delete cascade,
  item_id     text,
  name        text not null,
  qty         int not null default 1,
  unit_price  numeric(6,2) not null,
  line_price  numeric(7,2) not null,
  mods        jsonb not null default '[]'
);

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_live_idx on orders (collected, paid);
create index if not exists order_lines_order_idx on order_lines (order_id);

insert into menu_items (id, section, name, description, price, avail_from, avail_to, veg, allergens, removable, extras, sort_order) values
('b1','Breakfast Butties','The Full English Bap','Sausage, streaky bacon, fried egg, brown sauce, soft white bap',5.90,8,11,false,'["Gluten","Egg"]','["Sausage","Bacon","Egg","Brown sauce"]','[{"n":"Extra bacon","p":1.2},{"n":"Hash brown","p":1.0},{"n":"Cheese","p":0.8}]',10),
('b2','Breakfast Butties','Bacon & Egg Muffin','Smoked back bacon, fried egg, English muffin',4.50,8,11,false,'["Gluten","Egg"]','["Bacon","Egg"]','[{"n":"Extra bacon","p":1.2},{"n":"Cheese","p":0.8}]',20),
('b3','Breakfast Butties','Veggie Breakfast','Hash brown, halloumi, grilled tomato, egg, ciabatta',5.50,8,11,true,'["Gluten","Dairy","Egg"]','["Halloumi","Tomato","Egg"]','[{"n":"Avocado","p":1.5}]',30),
('a1','All-Day Sandwiches','The Classic Cheese & Pickle','Mature cheddar, Branston, butter, thick white bloomer',4.80,8,17,true,'["Gluten","Dairy"]','["Pickle","Butter"]','[{"n":"Extra cheese","p":0.8},{"n":"Ham","p":1.5}]',10),
('a2','All-Day Sandwiches','Coronation Chicken','Poached chicken, mild curried mayo, sultanas, little gem',5.90,8,17,false,'["Gluten","Egg"]','["Sultanas","Little gem"]','[]',20),
('a3','All-Day Sandwiches','Tuna Melt Toastie','Tuna, red onion, melted cheddar, toasted sourdough',5.60,8,17,false,'["Gluten","Dairy","Fish"]','["Red onion"]','[{"n":"Jalapeños","p":0.5}]',30),
('a4','All-Day Sandwiches','Hummus & Roast Veg','Roasted peppers, courgette, hummus, rocket, ciabatta',5.20,8,17,true,'["Gluten"]','["Rocket","Courgette"]','[{"n":"Halloumi","p":1.5},{"n":"Avocado","p":1.5}]',40),
('s1','Lunch Specials','Slow-Cooked Pulled Beef','12hr braised beef, horseradish crème, crispy onions, brioche roll',7.90,11,14,false,'["Gluten","Dairy"]','["Horseradish crème","Crispy onions"]','[{"n":"Extra beef","p":2.0},{"n":"Cheese","p":0.8}]',10),
('s2','Lunch Specials','Meatball Marinara Sub','Pork & beef meatballs, marinara, melted mozzarella, baguette',7.50,11,14,false,'["Gluten","Dairy"]','["Mozzarella"]','[{"n":"Extra meatballs","p":2.0}]',20),
('s3','Lunch Specials','Buttermilk Chicken','Fried chicken thigh, slaw, sriracha mayo, toasted bun',7.20,11,14,false,'["Gluten","Dairy","Egg"]','["Slaw","Sriracha mayo"]','[{"n":"Extra chicken","p":2.0}]',30),
('j1','Juices & Drinks','Green Machine','Apple, cucumber, spinach, celery, lemon, ginger',4.50,8,17,true,'[]','["Ginger"]','[]',10),
('j2','Juices & Drinks','Beetroot Booster','Beetroot, apple, carrot, orange',4.50,8,17,true,'[]','[]','[]',20),
('j3','Juices & Drinks','Flat White','House espresso blend',3.00,8,17,true,'["Dairy"]','[]','[{"n":"Extra shot","p":0.5},{"n":"Oat milk","p":0.4}]',30),
('j4','Juices & Drinks','Fresh Orange','Squeezed to order',3.80,8,17,true,'[]','[]','[]',40)
on conflict (id) do nothing;
