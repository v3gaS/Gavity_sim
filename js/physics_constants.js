/**
 * Gravitational parameters GM (m^3/s^2) consistent with NAIF generic kernel
 * gm_de440.tpc used with JPL planetary ephemeris DE440/441.
 *
 * Primary reference: Park, R.S. et al. 2021, AJ 161, 105 (DE440 and DE441).
 * Kernel: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc
 *
 * Values below are the standard DE440 GM entries (SI via km^3/s^2 × 10^9).
 */
export const GM_SI = {
    SUN: 1.3271244004127942e20,
    EARTH: 3.98600435436e14,
    MOON: 4.902800118e12,
    JUPITER: 1.265865349076e17,
};

/** Speed of light (m/s), defining length scale GM/c^2 for light bending. */
export const C_LIGHT = 299792458;

/**
 * GW150914 (GWTC-1) component masses in solar masses — illustrative only;
 * merger dynamics here are not numerical-relativity accurate.
 */
export const GW150914_ILLUSTRATIVE = {
    label: 'GW150914 (GWTC-1, illustrative only)',
    m1_solar: 36,
    m2_solar: 29,
};

/** MSUN * G / c^2 ≈ 1.477 km (Schwarzschild radius / 2 for 1 M☉). */
export function schwarzschildLengthM(massKg) {
    return (massKg * 6.6743e-11) / (C_LIGHT * C_LIGHT);
}

export function solarMassToKg(mSun) {
    return mSun * 1.98847e30;
}

/**
 * Build dimensionless Earth–Moon preset: separation = 1 in internal units,
 * sum(mu') = 1, circular orbit in CM frame.
 */
export function earthMoonDimensionless() {
    const muE = GM_SI.EARTH;
    const muM = GM_SI.MOON;
    const muSum = muE + muM;
    const rE = muM / muSum;
    const rM = muE / muSum;
    const omega = 1;
    const vE = omega * rE;
    const vM = omega * rM;
    return {
        label: 'Earth–Moon (DE440 GM, scaled)',
        separationScene: 8,
        bodies: [
            {
                name: 'Earth',
                color: 0x4a90d9,
                muFrac: muE / muSum,
                x: -rE,
                y: 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: -vE,
            },
            {
                name: 'Moon',
                color: 0xc0c0c0,
                muFrac: muM / muSum,
                x: rM,
                y: 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: vM,
            },
        ],
    };
}

/**
 * Sun–Jupiter–tracer: dimensionless CM, separation Sun–Jupiter = 1,
 * third body is low-mass tracer on exterior circular orbit (schematic).
 */
export function sunJupiterTracerDimensionless() {
    const muS = GM_SI.SUN;
    const muJ = GM_SI.JUPITER;
    const muSum = muS + muJ;
    const rS = muJ / muSum;
    const rJ = muS / muSum;
    const omega = 1;
    const vS = omega * rS;
    const vJ = omega * rJ;
    const tracerR = 1.55;
    const omegaT = Math.sqrt(1 / (tracerR * tracerR * tracerR));
    return {
        label: 'Sun–Jupiter + tracer (DE440 GM, scaled)',
        separationScene: 11,
        bodies: [
            {
                name: 'Sun',
                color: 0xffcc33,
                muFrac: muS / muSum,
                x: -rS,
                y: 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: -vS,
            },
            {
                name: 'Jupiter',
                color: 0xd4a574,
                muFrac: muJ / muSum,
                x: rJ,
                y: 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: vJ,
            },
            {
                name: 'Tracer',
                color: 0x66ffcc,
                muFrac: 1e-6,
                x: 0,
                y: 1,
                z: tracerR,
                vx: omegaT * tracerR,
                vy: 0,
                vz: 0,
            },
        ],
    };
}

/**
 * Toy “GW” binary: equal-order masses, illustrative mass ratio ~ GW150914,
 * Newtonian circular orbit — not a waveform or merger simulation.
 */
export function gw150914ToyDimensionless() {
    const m1 = GW150914_ILLUSTRATIVE.m1_solar;
    const m2 = GW150914_ILLUSTRATIVE.m2_solar;
    const mu1 = m1 / (m1 + m2);
    const mu2 = m2 / (m1 + m2);
    const r1 = m2 / (m1 + m2);
    const r2 = m1 / (m1 + m2);
    const omega = 1;
    return {
        label: `${GW150914_ILLUSTRATIVE.label} — Newtonian binary (toy)`,
        separationScene: 7,
        bodies: [
            {
                name: 'BH A',
                color: 0x9933ff,
                muFrac: mu1,
                x: -r1,
                y: 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: -omega * r1,
            },
            {
                name: 'BH B',
                color: 0x6633cc,
                muFrac: mu2,
                x: r2,
                y: 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: omega * r2,
            },
        ],
    };
}

export const PRESET_KEYS = {
    TOY: 'toy_three_body',
    EARTH_MOON: 'earth_moon',
    SUN_JUPITER: 'sun_jupiter',
    GW_TOY: 'gw150914_toy',
};

export function getPreset(key) {
    switch (key) {
        case PRESET_KEYS.TOY:
            return {
                label: 'Toy three-body (unitless μ)',
                separationScene: 1,
                bodies: [
                    {
                        name: 'Orange',
                        color: 0xff6600,
                        mass: 92,
                        x: -3,
                        y: 1,
                        z: -3,
                        vx: 0.15,
                        vy: 0,
                        vz: -0.08,
                    },
                    {
                        name: 'Green',
                        color: 0x00ff00,
                        mass: 29,
                        x: 3,
                        y: 1,
                        z: 3,
                        vx: -0.12,
                        vy: 0,
                        vz: 0.1,
                    },
                    {
                        name: 'Red',
                        color: 0xff0000,
                        mass: 10,
                        x: 0,
                        y: 1,
                        z: 0,
                        vx: 0.05,
                        vy: 0,
                        vz: 0.12,
                    },
                ],
            };
        case PRESET_KEYS.EARTH_MOON:
            return earthMoonDimensionless();
        case PRESET_KEYS.SUN_JUPITER:
            return sunJupiterTracerDimensionless();
        case PRESET_KEYS.GW_TOY:
            return gw150914ToyDimensionless();
        default:
            return getPreset(PRESET_KEYS.TOY);
    }
}
