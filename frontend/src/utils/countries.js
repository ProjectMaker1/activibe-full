import countryList from "react-select-country-list";

/**
 * Base list from library (value: "GE", label: "Georgia", etc.)
 */
const base = countryList().getData();

/**
 * Fix labels / add missing entries across the whole app
 * - Kosovo: XK (common code in many libs) + label "Kosovo"
 * - Taiwan: keep value TW but force label "Taiwan"
 */
export function getBaseCountries() {
  const map = new Map(base.map((c) => [c.value, { ...c }]));

  // Kosovo (if missing)
  if (!map.has("XK")) {
    map.set("XK", { value: "XK", label: "Kosovo" });
  }

  // Taiwan label fix
  if (map.has("TW")) {
    map.set("TW", { ...map.get("TW"), label: "Taiwan" });
  }

  return Array.from(map.values());
}

/**
 * For Campaigns + Upload only:
 * add special options at the top (not real countries)
 */
export function getCampaignCountries() {
  return [
    { value: "GLOBAL", label: "Global" },
    { value: "ONLINE", label: "Online" },
    ...getBaseCountries(),
  ];
}

/**
 * For Signup (no Global/Online)
 */
export function getSignupCountries() {
  return getBaseCountries();
}