export const SHOP_NAME = "Butty & Co";
export const SHOP_NAME_DISPLAY = "Butty & Co.";
export const SHOP_TAGLINE = "Sandwich & Juice Bar";
export const SHOP_STREET = "19 Replingham Road";
export const SHOP_AREA = "Southfields";
export const SHOP_POSTCODE = "SW18 5LT";
export const SHOP_CITY = "London";
export const SHOP_LAT = 51.444986;
export const SHOP_LNG = -0.20507;
export const SHOP_URL = "https://www.butty.london";

export const SHOP_ADDRESS_LINE = `${SHOP_STREET}, ${SHOP_AREA}, ${SHOP_POSTCODE}`;
export const SHOP_ADDRESS_SHORT = `${SHOP_STREET} · ${SHOP_AREA} · ${SHOP_POSTCODE}`;

const mapsQuery = encodeURIComponent(`${SHOP_NAME}, ${SHOP_ADDRESS_LINE}`);

export const SHOP_MAPS_SEARCH = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
export const SHOP_MAPS_DIR = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
export const SHOP_MAPS_EMBED = `https://maps.google.com/maps?q=${mapsQuery}&z=17&output=embed`;

export function localBusinessJsonLd(renovating: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: SHOP_NAME,
    alternateName: SHOP_NAME_DISPLAY,
    description: `${SHOP_TAGLINE} in ${SHOP_AREA}, ${SHOP_CITY}.`,
    url: SHOP_URL,
    image: `${SHOP_URL}/og.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: SHOP_STREET,
      addressLocality: SHOP_AREA,
      addressRegion: "Greater London",
      postalCode: SHOP_POSTCODE,
      addressCountry: "GB",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SHOP_LAT,
      longitude: SHOP_LNG,
    },
    hasMap: SHOP_MAPS_SEARCH,
    servesCuisine: "Sandwiches",
    priceRange: "£",
    ...(renovating
      ? {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "00:00",
          },
        }
      : {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
            opens: "08:00",
            closes: "17:00",
          },
        }),
  };
}
