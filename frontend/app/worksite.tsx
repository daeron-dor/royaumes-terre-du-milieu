import type { Theme } from './catalog';
export default function Worksite({ theme }: { theme: Theme }) {
  return (
    <svg
      className={`site-scaffold worksite-${theme}`}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={
        theme === 'elven'
          ? 'Chantier elfique : bois clair et cordages'
          : theme === 'dwarven'
            ? 'Chantier nain : palan et pierre taillée'
            : theme === 'shadow'
              ? 'Chantier du Mordor : fer noir et chaînes'
              : 'Chantier : échafaudage en bois'
      }
    >
      {theme === 'elven' ? (
        <>
          <path d="M15 94Q23 55 21 19M68 93Q63 50 73 12" stroke="#594c30" strokeWidth="5" />
          <path d="M15 93Q24 55 22 19M68 93Q65 50 74 12" stroke="#d4c39a" strokeWidth="2" />
          <path d="M21 22Q47 8 74 15M22 46Q47 34 68 38" stroke="#d7d2aa" strokeWidth="2" />
          <path d="m17 67 53-9 12 5-57 10z" fill="#aa9b6a" stroke="#5e633c" />
          <path d="M27 70v18m34-22v21M25 28v38M63 24v36" stroke="#b6ae7f" strokeWidth="2" />
          <path d="M23 20q23-10 48-6L58 37Q39 30 23 45z" fill="#59764c" stroke="#cad0a0" />
          <path d="M45 18v15m0-8-9-3m9 3 10-6" stroke="#dbe1b0" />
          <path d="m73 80 19-4-4 14-15 4z" fill="#98935c" />
        </>
      ) : theme === 'dwarven' ? (
        <>
          <path d="M18 90V21h53v68M18 21 63 57" stroke="#302e2b" strokeWidth="8" />
          <path d="M18 89V21h53" stroke="#8d8170" strokeWidth="3" />
          <path d="M15 20h65l-8-9H22z" fill="#65513b" stroke="#b49a69" strokeWidth="2" />
          <circle cx="55" cy="27" r="7" fill="#363d3d" stroke="#b8a16d" strokeWidth="3" />
          <path
            d="M55 34v29m0 0q-9 14 1 14q9-1 4-7"
            stroke="#b6aa8c"
            strokeWidth="3"
            strokeDasharray="3 2"
          />
          <path d="m42 80 29-5 18 10-30 8z" fill="#aaa18d" />
          <path d="m42 80 17 13v7l-17-11zm17 13 30-8v8l-30 7z" fill="#686966" />
          <path d="m2 84 22-4 12 7-23 5z" fill="#9f998a" />
          <path d="m2 84 11 8v8L2 93zm11 8 23-5v8l-23 5z" fill="#656867" />
          <path d="m26 15 4-2 4 2-4 3z" fill="#d2b16f" />
        </>
      ) : theme === 'shadow' ? (
        <>
          <path
            d="M16 94 22 17l9 8-7 68M71 89l-5-70 10-9 6 80"
            fill="#303236"
            stroke="#786e60"
            strokeWidth="2"
          />
          <path
            d="m16 30 62-9-3 10-56 10zm-1 38 65-7 3 9-69 8z"
            fill="#493b2d"
            stroke="#796449"
            strokeWidth="2"
          />
          <path
            d="M30 38 65 65M66 31 30 70"
            stroke="#88877b"
            strokeDasharray="3 3"
            strokeWidth="3"
          />
          <path d="m29 34 36-5-5 28-13-5-16 9z" fill="#782e23" stroke="#3c211b" />
          <path d="m37 42 9-5 10 3-9 7z" stroke="#d39a50" />
          <path d="m16 24 3-15 5 9m46-2 4-13 4 9" fill="#494949" />
          <path d="m80 84 15-4-3 15-12 4z" fill="#313331" stroke="#736449" />
          <path d="m84 86 3-12 5 8-2 9z" fill="#cb7834" />
        </>
      ) : (
        <>
          <path d="M20 90V24M63 84V17M83 70V9" stroke="#493421" strokeWidth="6" />
          <path d="M19 89V23M62 83V16M82 69V8" stroke="#b59662" strokeWidth="3" />
          <path
            d="m15 49 53-8 21-12-8-4-19 10-47 7zm0 24 53-8 21-12-8-4-19 10-47 7z"
            fill="#88704a"
            stroke="#483826"
            strokeWidth="2"
          />
          <path d="m22 83 38-40M24 48l35 32" stroke="#9c8053" strokeWidth="3" />
          <path
            d="m16 25 47-8 18-9v22L63 42 16 49z"
            fill="#706b48"
            stroke="#b5a783"
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
}
