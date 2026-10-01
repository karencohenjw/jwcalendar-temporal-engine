# Validation notes

The civil arithmetic is proleptic: Gregorian and Julian rules are extended across the supported range without modeling a jurisdiction-specific historical cutover. Gregorian years are 1–9999. Julian conversions use astronomical year numbering at the era boundary, with year 0 representing 1 BCE.

The absolute-day kernel is Rata Die: integer 1 represents Gregorian 0001-01-01, and weekdays are Monday=1 through Sunday=7. `toJulianDayNumber` returns the integer JDN associated with noon on a civil date; it is not a Julian-calendar conversion and is not a fractional Julian Date.

The 2027 federal holiday fixture is compared with the U.S. Office of Personnel Management schedule: [OPM Federal Holidays](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/). The rules distinguish each legal calendar date from its weekday-observed date. Work schedules other than a standard Monday–Friday schedule can require employee-specific “in lieu of” determinations; this package does not model those schedules.

Property tests generate thousands of valid day indexes and dates to exercise Gregorian, Julian, ordinal, and ISO-week round trips. OPM's schedule is the authority for the federal holiday fixture, while the calendar arithmetic is independently implemented and tested.
