-- Customer cards were using the burger mark. Point them at the wordmark only.
-- Names, prices, descriptions, hours, and shop flags are unchanged.

update menu_items
set photo = 'https://raw.githubusercontent.com/mdrago-1/butty-london/adf2a660759295dd04b09a7453b5c930a36f9ad1/public/butty-wordmark.svg'
where photo = '/butty-mark.jpg';
