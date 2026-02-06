export const TRANSLATIONS = {
  title: "TripPlanner",
  builder: "Plan Your Escape",
  savedMap: "Trip Summary",
  cityPrompt: "Destination City",
  queryPrompt: "What are you looking for?",
  queryPlaceholder: "What you'd like to discover",
  findPlaces: "Discover Spots",
  loadMore: "Find More",
  searching: "Searching the map...",
  savePlace: "Add to Trip",
  dismiss: "Skip",
  noCity: "Where should we go first?",
  noPlaces: "Your itinerary is empty",
  saved: "Added!",
  downloadKml: "Download Map",
  howToImport: "How to use",
  sources: "Map Evidence",
  reset: "Clear",
  layersTip: "Locations are grouped by city layers for easier navigation.",
  rating: "Rating",
  topRated: "Highly Recommended",
  apiError: "Visuals Restricted"
} as const;

export const API_LIMITS = {
  MAX_REQUESTS_PER_SESSION: Infinity,
  MIN_REQUEST_INTERVAL: 2000, // milliseconds
} as const;

export const CATEGORY_RULES: Record<string, string[]> = {
  'Tourist Attractions': ['attraction', 'historical', 'nature', 'monument', 'sight'],
  'Bar': ['nightlife', 'bar', 'club', 'pub', 'cocktail'],
  'Restaurants': ['food', 'restaurant', 'dining', 'cafe'],
  'Museums & Galleries': ['museum', 'gallery', 'art'],
  'Shopping': ['shop', 'market', 'mall'],
  'Beach': ['beach', 'sea', 'ocean'],
  'Hotels': ['hotel', 'accommodation']
};

export const CATEGORY_IMAGES = {
  FOOD: "https://media.istockphoto.com/id/1417838650/vector/knife-fork-silhouette-icon-vector-icon.jpg?s=612x612&w=0&k=20&c=aEC7Gqh8Fr7KC3bzhBqijGm_rgavKos6ifO1Hsh5U-U=",
  MUSEUM: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0VGDAlOY5W6bHDYDvuLzusoTiDWzEdNQWOg&s",
  SHOPPING: "https://www.creativefabrica.com/wp-content/uploads/2021/03/02/Shopping-bag-Hand-holding-a-shopping-Graphics-9096002-1.png",
  BEACH: "https://lh3.googleusercontent.com/rd-gg-dl/AOI_d_8CecRANywckgTLol5EwkBh-1XkV4tja5GkIR87G40aKwG2d0V5ZuYnZHMCja__WjXVz8j1d1RRYCNXY3GaTiGOLIXhaQv3NEuSYMoFaVIpculj5DQU15T3ARm1vIQIgzDDUSHRicih2qCyPa4s1bRUCF5s4lsV6i1YXsqRVHZc6mu-NFlJ0bySuKnZyzUW-A-QxXPvwY7QTvs77-yUpkfmJ0X2n_SQvMSMOHh3L3ozR515czYA5j72-Tec1aaJCuS2tMWU5FWaXFqzDUeyez8Zc-LZ23TfzhH_AFJH9XV2B2KxCdFmnYATYmcUWeQocip56zd-qOsdTRgWVAvJ-qfWBc2YWDfmh7SkdSIo_M3Q_HJ8wrQPKhUsJ_m5a5yqw46XkAZjHao1SPly9oaeHlxXByZQ1TxKdpgCtucM_ns3ZqrDvabYxQjzbLRT0LvXI2rxyhiQiUviCor8oZwKxFVVNeUbLRPqxby-0_6BLsA5x-a3L9WyYz_bb_CEFHp1IcLN2RNAZMmLcap57GkjfKxWwZU6FMpySzeuMCTz0tiUq2jeffSxFWOheMK9NQoH5-wJbcsfGTeb0GuLSEgdB8ZjAxXiyvJ6LKDqpaVURquxTi0OTTsYkeNAe5wi03y2FYU_8-m0SG-NPmZXQTiLrQSeba2BoTdpECtm0MCEqTsmpgPCP7qwcLtDkEEqdxQPqlPx_64YP0qi0qU62mr5JG8A_soI_PiddrM_FnDvQYvravjswG-OcB1dap-tyYKgnSG4Pgh98co9zCZ-FvjkmZFro7epMFcGSohn7QabPin2co8NB06IupQ4uFKNf8WMaFTzNuIspjRHYfID1EWe-sD5KCwncjH16S28tLc47yyZR9ScbIzC49VcN7Crn0Sr2vL6rdoIPF5c3aeyDRqx4QhgNwLLDkB5610GYUOHznY9ITYYXUJ5R04WQdaBYcCEBlUyuySc1TbhrR195SGf-nKK-jaTgfgNbTjVRci3RunpSwOVHJaJFWMNJsiLaoZhDSP9KWxYua8DNZuQXkeHkUGD9MSGPWJE94M3pxkl5BJQRf__NAfZGzbqFfcfFTCo7NffAGnAvBsjG_-inuHmx4sYnythxqPI-YAFtu8_NrrjJAkmt4TkPXXgo3tRZgdtRZKpGqVKxlqwm3bfMOhU4b5aSgoyOfJCnkgxrv4MwabGURg=s1024-rj",
  HOTEL: "https://lh3.googleusercontent.com/rd-gg-dl/AOI_d_-cxgg2LpPUvgNZc7AeCIHFqxFcvkkUCKEF5UtDbmPacpMBnlTw1-2lVN4wGrdwYSVRIlGmBLMeoWFRNzvwoj6l5vwet1z_Cp3s90HxqFokW3ENWcd_IkECPCOlRxETqPdsX-qsCPDl-XragUYY3dIKMxhj4DS3DgGePitS1aT5Ob_D3p-nC4Qb4cZQO6OdL4zw-ApOWSCAEn-2AvkEP3YYmRuqGRqiMwnIVq1uNXKF4UOafwzppaiTkcQNUtpj4Tv95wRngddKg1YpsopolQMWWf2ae5zVrQLrVzw_asYQoqGFeQUB_Q6IhzGDfBv4HDBDBdj-cZCRr03eC9amFFY8omWGGs8t5C1FqBjYRj-dzHKTWBVdagI9d-BLn3EmqJB37q63Unf4tGcm0bFiU2bcpLV1fe85TbmJCHLchmhBdAMCbJm-QD7GpL4C8Mp4XgmtdWkxFLCasd19lPsqAWY4-g0HvPjdY-suM334bDPOpKgQ8j99KS5rnrl8WgmbIYPiBctx1cvky2szps5f1wxBjebEGmW9wzCfNCShz5C9ZnhzVOxZ9Zw9M4vuuHPIzFvgZeXsIDyqe1YBMH9MCo04A0q3EkUJeBTkhIbAYzNm34gn7t7AsO8MS7cOpEUJ_6QB9ZkT-1AlyAlmDKEdRqPvDp5yqpYiXcx0slVbkdh-UzGOccfBksFV6FKvngh2iofCGy7SMxU2tvvje54cxKAuHujcVSyj4ePKNWv3tvMAkWQ2sbPqcnW77TUsE7dkT5zcafe7R20Y2k5T6sXAx-kDul7dK08qRn5OVZNrZgZq65zuF1ec2qMDQR3tn3EySvPZCX2PX05lzbb3_ovQ-uJExXSMubWXRKnaPgrvMIroOBxG4yfJmj_Tlvhm8ZMhMeDtIkoUD2pG_SPix2kYOPpifVH1WUhTCnofVL2ijtpXPO15DZTJUQsmyYrUolwQLwXHjQ6HCnyTEcNwabvEe6rWO43oofmGz5673mz9lELTsi3fXovj6xYSgU5AEddLa6A6rtR96p3iCmFluDXxY2E9FNzIHaOFHCgfaUdGahn5Tgm5xE64fs8sjnFLxMAqSO2KIj40zlyibhY69tXLAWAyMq-pTPIzjPInqLrmyjHQmpDfYZrfd5sVFQKmRAhPX3b-NmvK0AaDMDXvrsEaQuz_UYZEwcl4FRyNzqk1a21ByA=s1024-rj",
  BAR: "https://lh3.googleusercontent.com/rd-gg-dl/AOI_d_-SIPCLU0GRfbB3LS-hYnJdSwk9vfA0CREqHdHurcnIDYogZOOsFstsU4_Lzy7bIbt7IPqsqflBX5P3MW34l9c2S1LBWCrwuRCP8UucIY7T7vavfbQ35u8cfL6AZxnvsqaHOgc1xm8TH5CiLpLtJYMh3eCQwGdhsY_UepYjunt9GRFlk9gSMG50UU-b6IAKkoZkMJ5gIZySlPwL3keyFzuisPi_r2YwnPCes9xCbv8wToHwpFmtM2UizMMzrF0Lje0D4V-X11ubzQfMkkj28LoO4W5Ltrr3Fxf8scmqSR3V-Bx_UX0s7qBDfloCSGbFQWSCAOWNT2LMRiiPpJQIaBeWnzQYcbBAuZ5i0oztAeU-6k0WBPhSkhCDKFjP0l0koO_8iciyNLj-eOttX5l2PFFCsoUou4CX5tt2pdsdtlyUL5HMRBmVZrAlzbzU3x7hDjJOglrFtISpEYJYmJh8tjz2hKiv_og6B4okLUBQfiChxJz2wRatD9dXc9r9MSMmtownWhUoRKNqoZuJTbdFPORGt0Z-FXuuFUAhzVGeYtgdquqL_mER7Z5-4YRSPGzrGX5aBxutUagc4nxzHH9s1EhsbHK75mcOlS24O5Bv1blGiCqR06HsO9B7xfrNXhvOcMMVyYFwyoraNS0Q_X-du66m56lFTGJxL6FUV_vOCtsVpEiVWGJpPr_dxx9Wi8s1qzsfLQEOvKQzk9JD1e2qxjEBpUznbcZSAJYhScuHXsUlZLMK6LyzxXiy6xCKglbOTucBunH86QS9DAC-2kCXSyoz6mCti7-XIDv0X62FdoHFFbzA3JuBGNoD8Rz4tfeLFFtFVKjAfkHXsA_J5Ghzg2uP3jOCujgXsAwq_CLFsayNG0iUWgETspck2Uyd6Co1eUMLeULLQYtjSc27moTV89mWRVtbCCAV9MGuf1JuDkuWLDtT7yx8r8rL6d8N0nxNoT3mNpkBDfncmKzCaFx4oTGcpsaBgB-bRC6topXCzHqBKh0RL88dL6Lo_daZmTiylxfiqMSlvy2ZlYsH5sQvTquuWQPoUTd52_WuNCvVSbOxfSlz1iGZcVvHiCuXkPebAFHAhL6qaA6bemSk_2KGFGYxWMM6b5zmwDQwzLLoQ6v9jtERTtn4AtPFvT1XDyNzifZwJkad9lLl8D1FOdMjKAC5oS6KwCThVEBS-p8tLkcHlA=s1024-rj",
  DEFAULT: "https://m.media-amazon.com/images/I/714Uj0TkppL.jpg"
} as const;

export const KML_ICON_STYLES: Record<string, string> = {
  'Tourist Attractions': 'icon-camera',
  'Bar': 'icon-bars',
  'Restaurants': 'icon-dining',
  'Museums & Galleries': 'icon-arts',
  'Shopping': 'icon-shopping',
  'Beach': 'icon-beach',
  'Hotels': 'icon-hotel'
};

export const AVAILABLE_KML_ICONS = [
  { id: 'icon-camera', name: 'Camera', url: 'http://maps.google.com/mapfiles/kml/shapes/camera.png' },
  { id: 'icon-dining', name: 'Dining', url: 'http://maps.google.com/mapfiles/kml/shapes/dining.png' },
  { id: 'icon-arts', name: 'Arts', url: 'http://maps.google.com/mapfiles/kml/shapes/arts.png' },
  { id: 'icon-shopping', name: 'Shopping', url: 'http://maps.google.com/mapfiles/kml/shapes/shopping.png' },
  { id: 'icon-parks', name: 'Parks', url: 'http://maps.google.com/mapfiles/kml/shapes/parks.png' },
  { id: 'icon-beach', name: 'Beach', url: 'http://maps.google.com/mapfiles/kml/shapes/swimming.png' },
  { id: 'icon-bars', name: 'Bars', url: 'http://maps.google.com/mapfiles/kml/shapes/bars.png' },
  { id: 'icon-hotel', name: 'Hotel', url: 'http://maps.google.com/mapfiles/kml/shapes/lodging.png' },
] as const;
