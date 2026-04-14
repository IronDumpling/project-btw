import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/contacts",  label: "Contacts" },
  { to: "/capture",   label: "Captures" },
  { to: "/profile",   label: "My Profile" },
  { to: "/settings",  label: "Settings" },
];

export default function NavSidebar() {
  return (
    <nav className="nav-sidebar">
      <div className="nav-logo">btw</div>
      <ul className="nav-list">
        {NAV_ITEMS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `nav-item${isActive ? " nav-item-active" : ""}`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
