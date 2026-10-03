-- Customer menu cards use each item's photo. Point them at the existing mark.
-- Names, prices, descriptions, hours, and shop flags are unchanged.

update menu_items
set photo = '/butty-mark.jpg'
where photo is distinct from '/butty-mark.jpg';
