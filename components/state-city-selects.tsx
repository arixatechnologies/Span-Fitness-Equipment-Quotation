"use client";

import { useMemo, useState } from "react";
import { indiaStateCityList } from "@/lib/india-state-city-list";

type StateCitySelectsProps = {
  stateName?: string;
  cityName?: string;
  defaultState?: string | null;
  defaultCity?: string | null;
};

export function StateCitySelects({
  stateName = "state",
  cityName = "city",
  defaultState,
  defaultCity
}: StateCitySelectsProps) {
  const stateOptions = indiaStateCityList.map((item) => item.state);
  const [selectedState, setSelectedState] = useState(defaultState || "");
  const [selectedCity, setSelectedCity] = useState(defaultCity || "");

  const cityOptions = useMemo(() => {
    const stateData = indiaStateCityList.find((item) => item.state === selectedState);
    return stateData?.cities || [];
  }, [selectedState]);

  const visibleStateOptions = stateOptions.includes(selectedState) || !selectedState
    ? stateOptions
    : [...stateOptions, selectedState];

  const visibleCityOptions = cityOptions.includes(selectedCity) || !selectedCity
    ? cityOptions
    : [...cityOptions, selectedCity];

  return (
    <>
      <label>
        <span className="field-label">State</span>
        <select
          className="field-input"
          name={stateName}
          value={selectedState}
          onChange={(event) => {
            setSelectedState(event.target.value);
            setSelectedCity("");
          }}
        >
          <option value="">Select state</option>
          {visibleStateOptions.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">City</span>
        <select
          className="field-input"
          name={cityName}
          value={selectedCity}
          onChange={(event) => setSelectedCity(event.target.value)}
          disabled={!selectedState && !selectedCity}
        >
          <option value="">Select city</option>
          {visibleCityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
