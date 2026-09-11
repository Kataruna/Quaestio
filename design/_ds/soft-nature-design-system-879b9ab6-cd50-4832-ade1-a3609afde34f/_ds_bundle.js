/* @ds-bundle: {"format":4,"namespace":"SoftNatureDesignSystem_879b9a","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"AvatarStack","sourcePath":"components/core/AvatarStack.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"FilterChip","sourcePath":"components/data/FilterChip.jsx"},{"name":"InterestScale","sourcePath":"components/data/InterestScale.jsx"},{"name":"ProgressTrack","sourcePath":"components/data/ProgressTrack.jsx"},{"name":"StatBlock","sourcePath":"components/data/StatBlock.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"SelectPill","sourcePath":"components/forms/SelectPill.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"PillBar","sourcePath":"components/navigation/PillBar.jsx"},{"name":"SectionHeader","sourcePath":"components/navigation/SectionHeader.jsx"},{"name":"SidebarRail","sourcePath":"components/navigation/SidebarRail.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"a94fffb40a1c","components/core/AvatarStack.jsx":"2963c54b8b73","components/core/Badge.jsx":"66fda1acfb27","components/core/Button.jsx":"dbaf39e42f28","components/core/Card.jsx":"fea737b3bcf5","components/core/Icon.jsx":"dc9f6c015aac","components/core/IconButton.jsx":"0762206451af","components/core/Tag.jsx":"e33b20b5da6f","components/data/FilterChip.jsx":"87c21c852c53","components/data/InterestScale.jsx":"577344998440","components/data/ProgressTrack.jsx":"c65adb0e4ec9","components/data/StatBlock.jsx":"58fb19e1eb60","components/forms/Checkbox.jsx":"5a90cc7e5d4e","components/forms/Input.jsx":"b1000ede321c","components/forms/SearchField.jsx":"9c4068d63e87","components/forms/SelectPill.jsx":"33fc8fa7580a","components/forms/Switch.jsx":"8f67105c206f","components/navigation/PillBar.jsx":"2df495299107","components/navigation/SectionHeader.jsx":"bc8640d55da2","components/navigation/SidebarRail.jsx":"e7bca643c1a7","ui_kits/mobile/MobileShell.jsx":"67477b43e1e2","ui_kits/mobile/app.jsx":"05c80c270ebf","ui_kits/mobile/screens.jsx":"97406f4f8c4e","ui_kits/workspace/CallOverlay.jsx":"5f060e15d96e","ui_kits/workspace/LeadCard.jsx":"a821c02fdc47","ui_kits/workspace/TaskCard.jsx":"c1bd4e49ce75","ui_kits/workspace/WorkspaceShell.jsx":"8ebcf70b12fc","ui_kits/workspace/app.jsx":"4dc028b67973","ui_kits/workspace/data.js":"bc58553f5efc","ui_kits/workspace/screens.jsx":"1b2d000958af"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SoftNatureDesignSystem_879b9a = window.SoftNatureDesignSystem_879b9a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const AV_SIZES = {
  xs: 22,
  sm: 28,
  md: 38,
  lg: 48,
  xl: 64
};
function Avatar({
  src,
  name = '',
  size = 'md',
  ring,
  status,
  style,
  ...rest
}) {
  const px = typeof size === 'number' ? size : AV_SIZES[size];
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: 'none'
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: px,
      height: px,
      borderRadius: 'var(--radius-avatar)',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-sunken)',
      color: 'var(--text-muted)',
      font: `var(--weight-semibold) ${Math.round(px * .36)}px/1 var(--font-display)`,
      boxShadow: ring ? '0 0 0 2px var(--surface-card)' : 'none',
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials), status && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: -1,
      bottom: -1,
      width: Math.max(8, px * .24),
      height: Math.max(8, px * .24),
      borderRadius: 'var(--radius-pill)',
      background: status === 'online' ? 'var(--status-won)' : 'var(--neutral-400)',
      boxShadow: '0 0 0 2px var(--surface-card)'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/AvatarStack.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function AvatarStack({
  people = [],
  size = 'sm',
  max = 3,
  overlap = 8,
  style,
  ...rest
}) {
  const shown = people.slice(0, max),
    extra = people.length - shown.length;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      ...style
    }
  }, rest), shown.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      marginLeft: i ? -overlap : 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, _extends({}, p, {
    size: size,
    ring: true
  })))), extra > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: -overlap,
      height: size === 'xs' ? 22 : 28,
      minWidth: size === 'xs' ? 22 : 28,
      padding: '0 6px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunken)',
      boxShadow: '0 0 0 2px var(--surface-card)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--type-micro)',
      color: 'var(--text-muted)'
    }
  }, "+", extra));
}
Object.assign(__ds_scope, { AvatarStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/AvatarStack.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BADGE_TONES = {
  neutral: {
    background: 'var(--surface-sunken)',
    color: 'var(--text-muted)'
  },
  hot: {
    background: 'var(--status-hot-bg)',
    color: 'var(--status-hot)'
  },
  warm: {
    background: 'var(--status-warm-bg)',
    color: 'var(--status-warm)'
  },
  due: {
    background: 'var(--status-due-bg)',
    color: '#8A6A08'
  },
  won: {
    background: 'var(--status-won-bg)',
    color: '#2F7A27'
  },
  info: {
    background: 'var(--status-info-bg)',
    color: 'var(--status-info)'
  },
  solid: {
    background: 'var(--status-hot)',
    color: '#fff'
  },
  accent: {
    background: 'var(--surface-accent)',
    color: 'var(--text-on-accent)'
  }
};
function Badge({
  tone = 'neutral',
  dot,
  count,
  children,
  style,
  ...rest
}) {
  if (count != null) return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--status-hot)',
      color: '#fff',
      font: 'var(--weight-bold) var(--size-nano)/18px var(--font-sans)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }
  }, rest), count);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      font: 'var(--type-micro)',
      ...BADGE_TONES[tone],
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'currentColor'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CARD_TONES = {
  white: {
    background: 'var(--surface-card)',
    color: 'var(--text-body)'
  },
  accent: {
    background: 'var(--surface-accent)',
    color: 'var(--text-on-accent)'
  },
  ink: {
    background: 'var(--surface-ink)',
    color: 'var(--text-on-ink)'
  },
  sunken: {
    background: 'var(--surface-sunken)',
    color: 'var(--text-body)'
  }
};
function Card({
  tone = 'white',
  pad = 'var(--pad-card)',
  interactive,
  radius = 'var(--radius-card)',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: radius,
      padding: pad,
      boxShadow: tone === 'sunken' ? 'none' : interactive && hover ? 'var(--elevation-card-hover)' : 'var(--elevation-card)',
      transition: 'var(--transition-hover)',
      transform: interactive && hover ? 'translateY(-2px)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      ...CARD_TONES[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Lucide glyphs, rendered from the official Lucide icon data (loaded once from the
   lucide UMD build) rather than a remote CSS mask — masks silently fail to a solid
   block in sandboxed previews. No icon assets shipped with the source material;
   see readme.md > ICONOGRAPHY. */
const LUCIDE_SRC = 'https://unpkg.com/lucide@0.474.0/dist/umd/lucide.js';
let iconsReady = typeof window !== 'undefined' && window.lucide && window.lucide.icons || null;
const listeners = new Set();
function ensureLucide() {
  if (typeof document === 'undefined' || iconsReady) return;
  if (window.lucide && window.lucide.icons) {
    iconsReady = window.lucide.icons;
    listeners.forEach(fn => fn());
    return;
  }
  if (document.querySelector('script[data-lucide-loader]')) return;
  const s = document.createElement('script');
  s.src = LUCIDE_SRC;
  s.setAttribute('data-lucide-loader', '');
  s.onload = () => {
    iconsReady = window.lucide && window.lucide.icons || null;
    listeners.forEach(fn => fn());
  };
  document.head.appendChild(s);
}
function pascal(slug) {
  return String(slug).split(/[-_]/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
}
function nodesOf(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) {
    if (entry.length === 3 && entry[0] === 'svg' && Array.isArray(entry[2])) return entry[2];
    return entry;
  }
  return [];
}
function toReactAttrs(attrs, key) {
  const out = {
    key
  };
  for (const k in attrs) {
    if (k === 'key') continue;
    const rk = k.startsWith('data-') || k.startsWith('aria-') ? k : k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    out[rk] = attrs[k];
  }
  return out;
}
function Icon({
  name = 'circle',
  size = 16,
  strokeColor,
  strokeWidth = 1.75,
  style,
  ...rest
}) {
  const [, tick] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    if (iconsReady) return;
    listeners.add(tick);
    ensureLucide();
    return () => listeners.delete(tick);
  }, []);
  const set = iconsReady;
  const entry = set ? set[pascal(name)] || set[name] : null;
  const nodes = nodesOf(entry);
  const box = {
    display: 'inline-block',
    flex: 'none',
    width: size,
    height: size,
    color: strokeColor || 'currentColor',
    ...style
  };
  if (!nodes.length) return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true"
  }, rest, {
    style: box
  }));
  return /*#__PURE__*/React.createElement("svg", _extends({
    "aria-hidden": "true"
  }, rest, {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: box
  }), nodes.map((n, i) => React.createElement(n[0], toReactAttrs(n[1] || {}, i))));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BTN_BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-4)',
  border: 'none',
  cursor: 'pointer',
  font: 'var(--weight-semibold) var(--size-body)/1 var(--font-sans)',
  borderRadius: 'var(--radius-button)',
  transition: 'var(--transition-hover)',
  whiteSpace: 'nowrap'
};
const BTN_SIZES = {
  sm: {
    padding: '8px 14px',
    fontSize: 'var(--size-body-s)'
  },
  md: {
    padding: '11px 20px'
  },
  lg: {
    padding: '14px 26px',
    fontSize: 'var(--size-title-s)'
  }
};
const BTN_VARIANTS = {
  primary: {
    background: 'var(--surface-ink)',
    color: 'var(--text-on-ink)'
  },
  accent: {
    background: 'var(--surface-accent)',
    color: 'var(--text-on-accent)'
  },
  secondary: {
    background: 'var(--surface-card)',
    color: 'var(--text-strong)',
    boxShadow: 'var(--elevation-card)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled,
  full,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false),
    [down, setDown] = React.useState(false);
  const hoverStyle = !disabled && hover ? {
    primary: {
      background: 'var(--ink-700)'
    },
    accent: {
      background: 'var(--lime-500)'
    },
    secondary: {
      boxShadow: 'var(--elevation-card-hover)'
    },
    ghost: {
      background: 'var(--surface-sunken)',
      color: 'var(--text-strong)'
    }
  }[variant] : null;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setDown(false);
    },
    onMouseDown: () => setDown(true),
    onMouseUp: () => setDown(false),
    style: {
      ...BTN_BASE,
      ...BTN_SIZES[size],
      ...BTN_VARIANTS[variant],
      ...hoverStyle,
      width: full ? '100%' : undefined,
      transform: down ? 'scale(var(--press-scale))' : 'none',
      opacity: disabled ? .4 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: size === 'sm' ? 14 : 16
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: size === 'sm' ? 14 : 16
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const IB_SIZES = {
  sm: 28,
  md: 36,
  lg: 44
};
const IB_VARIANTS = {
  plain: {
    background: 'var(--surface-card)',
    color: 'var(--text-strong)',
    boxShadow: 'var(--elevation-card)'
  },
  ink: {
    background: 'var(--surface-ink)',
    color: 'var(--text-on-ink)'
  },
  accent: {
    background: 'var(--surface-accent)',
    color: 'var(--text-on-accent)'
  },
  quiet: {
    background: 'transparent',
    color: 'var(--text-muted)'
  },
  danger: {
    background: 'var(--status-hot)',
    color: '#fff'
  }
};
function IconButton({
  icon = 'more-horizontal',
  size = 'md',
  variant = 'plain',
  label,
  style,
  ...rest
}) {
  const [down, setDown] = React.useState(false),
    [hover, setHover] = React.useState(false);
  const px = IB_SIZES[size];
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label || icon,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setDown(false);
    },
    onMouseDown: () => setDown(true),
    onMouseUp: () => setDown(false),
    style: {
      width: px,
      height: px,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      transition: 'var(--transition-hover)',
      ...IB_VARIANTS[variant],
      boxShadow: hover && variant === 'plain' ? 'var(--elevation-card-hover)' : IB_VARIANTS[variant].boxShadow,
      transform: down ? 'scale(var(--press-scale))' : 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  onRemove,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-card)',
      boxShadow: '0 0 0 1px var(--line-hairline)',
      font: 'var(--type-micro)',
      color: 'var(--text-muted)',
      ...style
    }
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Remove",
    style: {
      border: 'none',
      background: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--text-faint)',
      font: 'inherit',
      lineHeight: 1
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/data/FilterChip.jsx
try { (() => {
function FilterChip({
  children,
  active,
  icon,
  dotColor,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      font: 'var(--type-label)',
      whiteSpace: 'nowrap',
      transition: 'var(--transition-hover)',
      background: active ? 'var(--surface-card)' : hover ? 'var(--surface-card)' : 'transparent',
      color: active ? 'var(--text-strong)' : 'var(--text-muted)',
      boxShadow: active ? 'var(--elevation-card)' : 'none',
      ...style
    }
  }, dotColor && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 'var(--radius-pill)',
      background: dotColor
    }
  }), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  }), children);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/data/InterestScale.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SCALE_DOTS = ['var(--status-hot)', 'var(--status-warm)', 'var(--status-due)', 'var(--lime-400)', 'var(--status-won)'];
function InterestScale({
  level = 3,
  size = 9,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 3
    }
  }, SCALE_DOTS.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-pill)',
      background: i < level ? c : 'var(--neutral-200)'
    }
  }))));
}
Object.assign(__ds_scope, { InterestScale });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/InterestScale.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressTrack.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressTrack({
  value = 0,
  tone = 'accent',
  height = 6,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'block',
      width: '100%',
      height,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-sunken)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      width: `${Math.max(0, Math.min(100, value))}%`,
      borderRadius: 'var(--radius-pill)',
      background: tone === 'ink' ? 'var(--surface-ink)' : 'var(--surface-accent)',
      transition: 'width var(--duration-slow) var(--ease-out-soft)'
    }
  }));
}
Object.assign(__ds_scope, { ProgressTrack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressTrack.jsx", error: String((e && e.message) || e) }); }

// components/data/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DELTA_TONES = {
  up: {
    background: 'var(--surface-accent)',
    color: 'var(--text-on-accent)'
  },
  down: {
    background: 'var(--status-hot)',
    color: '#fff'
  },
  flat: {
    background: 'var(--surface-sunken)',
    color: 'var(--text-muted)'
  }
};
function StatBlock({
  value,
  label,
  delta,
  direction = 'up',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'flex-start',
      gap: 8,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-stat)',
      color: 'var(--text-strong)',
      letterSpacing: 'var(--track-tight)'
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      paddingTop: 6
    }
  }, delta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      padding: '2px 6px',
      borderRadius: 'var(--radius-pill)',
      font: 'var(--weight-bold) var(--size-nano)/1.3 var(--font-sans)',
      ...DELTA_TONES[direction]
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: direction === 'down' ? 'arrow-down' : 'arrow-up',
    size: 9
  }), delta), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-muted)'
    }
  }, label)));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .4 : 1,
      font: 'var(--type-body)',
      color: 'var(--text-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 20,
      height: 20,
      flex: 'none',
      borderRadius: 'var(--radius-xs)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? 'var(--surface-accent)' : 'var(--surface-card)',
      boxShadow: checked ? 'none' : '0 0 0 1px var(--line-strong)',
      color: 'var(--text-on-accent)',
      transition: 'var(--transition-hover)'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13
  })), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  icon,
  suffix,
  invalid,
  pill = true,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)',
      paddingLeft: pill ? 14 : 2
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: pill ? '10px 16px' : '10px 12px',
      borderRadius: pill ? 'var(--radius-field)' : 'var(--radius-sm)',
      background: 'var(--surface-card)',
      boxShadow: invalid ? '0 0 0 1px var(--status-hot)' : focus ? 'var(--shadow-focus)' : '0 0 0 1px var(--line-hairline)',
      transition: 'var(--transition-hover)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    style: {
      color: 'var(--text-faint)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest, {
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: 'var(--type-body)',
      color: 'var(--text-strong)'
    }
  })), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, suffix)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchField({
  placeholder = 'Search',
  collapsed,
  onClick,
  style,
  ...rest
}) {
  if (collapsed) return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": "Search",
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      background: 'var(--surface-card)',
      boxShadow: 'var(--elevation-card)',
      color: 'var(--text-strong)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 16px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-card)',
      boxShadow: 'var(--elevation-card)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--text-faint)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    placeholder: placeholder
  }, rest, {
    style: {
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: 'var(--type-body)',
      color: 'var(--text-strong)',
      width: '100%'
    }
  })));
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/SelectPill.jsx
try { (() => {
function SelectPill({
  value,
  options = [],
  onChange,
  leading,
  tone = 'white',
  style
}) {
  const [open, setOpen] = React.useState(false);
  const ink = tone === 'ink';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-block'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 12px 7px 8px',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      cursor: 'pointer',
      background: ink ? 'var(--surface-ink)' : 'var(--surface-card)',
      color: ink ? 'var(--text-on-ink)' : 'var(--text-strong)',
      boxShadow: ink ? 'none' : '0 0 0 1px var(--line-hairline)',
      font: 'var(--type-label)',
      transition: 'var(--transition-hover)',
      ...style
    }
  }, leading, /*#__PURE__*/React.createElement("span", null, value), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      color: ink ? 'rgba(255,255,255,.6)' : 'var(--text-faint)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--duration-fast) var(--ease-standard)'
    }
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: 0,
      zIndex: 20,
      minWidth: '100%',
      padding: 6,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-card)',
      boxShadow: 'var(--elevation-floating)'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("button", {
    key: o,
    onClick: () => {
      onChange && onChange(o);
      setOpen(false);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      whiteSpace: 'nowrap',
      padding: '8px 12px',
      border: 'none',
      background: o === value ? 'var(--surface-sunken)' : 'transparent',
      color: 'var(--text-body)',
      borderRadius: 'var(--radius-xs)',
      font: 'var(--type-label)',
      cursor: 'pointer'
    }
  }, o))));
}
Object.assign(__ds_scope, { SelectPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SelectPill.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    role: "switch",
    "aria-checked": !!checked,
    disabled: disabled,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 42,
      height: 24,
      padding: 3,
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--surface-accent)' : 'var(--neutral-300)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .4 : 1,
      display: 'inline-flex',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      alignItems: 'center',
      transition: 'background-color var(--duration-base) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'var(--transition-hover)'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PillBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PillBar({
  children,
  tone = 'ink',
  pad = '6px 8px',
  style,
  ...rest
}) {
  const ink = tone === 'ink';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: pad,
      borderRadius: 'var(--radius-pill)',
      background: ink ? 'var(--surface-ink)' : 'var(--surface-card)',
      color: ink ? 'var(--text-on-ink)' : 'var(--text-strong)',
      boxShadow: ink ? 'var(--elevation-floating)' : 'var(--elevation-card)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { PillBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PillBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionHeader({
  title,
  count,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-8)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-section)',
      color: 'var(--text-strong)',
      letterSpacing: 'var(--track-tight)'
    }
  }, title), count && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-strong)',
      borderBottom: '1.5px solid var(--lime-400)',
      paddingBottom: 2
    }
  }, count), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--gap-chip-row)'
    }
  }, children));
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarRail.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SidebarRail({
  items = [],
  activeId,
  onSelect,
  footer,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      width: 'var(--rail-width)',
      padding: '8px 0',
      ...style
    }
  }, rest), items.map(it => {
    const on = it.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      title: it.label,
      "aria-label": it.label,
      onClick: () => onSelect && onSelect(it.id),
      style: {
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-pill)',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'var(--transition-hover)',
        background: on ? 'var(--surface-ink)' : 'var(--surface-card)',
        color: on ? 'var(--text-on-ink)' : 'var(--text-muted)',
        boxShadow: on ? 'none' : 'var(--shadow-xs)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 17
    }));
  }), footer && /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 'auto'
    }
  }, footer));
}
Object.assign(__ds_scope, { SidebarRail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarRail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/MobileShell.jsx
try { (() => {
const {
  Icon,
  Avatar,
  IconButton
} = window.SoftNatureDesignSystem_879b9a;
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 26px 2px',
      font: 'var(--weight-semibold) var(--size-body-s)/1 var(--font-sans)',
      color: 'var(--text-strong)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 14
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 14
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 16
  })));
}
function TabBar({
  tab,
  onTab
}) {
  const items = [{
    id: 'today',
    icon: 'layout-grid',
    label: 'Today'
  }, {
    id: 'leads',
    icon: 'users',
    label: 'Leads'
  }, {
    id: 'new',
    icon: 'plus',
    label: 'New'
  }, {
    id: 'chat',
    icon: 'message-circle',
    label: 'Chat'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      margin: '0 16px 10px',
      padding: 6,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-ink)',
      boxShadow: 'var(--elevation-floating)'
    }
  }, items.map(i => {
    const on = tab === i.id;
    return /*#__PURE__*/React.createElement("button", {
      key: i.id,
      onClick: () => onTab(i.id),
      "aria-label": i.label,
      style: {
        flex: on ? '1 1 auto' : '0 0 auto',
        minHeight: 48,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: on ? '0 20px' : '0 16px',
        border: 'none',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        transition: 'var(--transition-hover)',
        background: on ? 'var(--surface-accent)' : 'transparent',
        color: on ? 'var(--text-on-accent)' : 'rgba(255,255,255,.6)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: i.icon,
      size: 18
    }), on && /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--weight-semibold) var(--size-body-s)/1 var(--font-sans)'
      }
    }, i.label));
  }));
}
function MobileShell({
  tab,
  onTab,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)',
      borderRadius: 44,
      overflow: 'hidden',
      boxShadow: 'var(--elevation-modal)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: '6px 16px 12px'
    }
  }, children), /*#__PURE__*/React.createElement(TabBar, {
    tab: tab,
    onTab: onTab
  }));
}
Object.assign(window, {
  MobileShell,
  TabBar,
  StatusBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/MobileShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/app.jsx
try { (() => {
function MobileApp() {
  const [tab, setTab] = React.useState('today');
  const [lead, setLead] = React.useState(null);
  let screen;
  if (lead) screen = /*#__PURE__*/React.createElement(LeadDetailScreen, {
    lead: lead,
    onBack: () => setLead(null)
  });else if (tab === 'today') screen = /*#__PURE__*/React.createElement(TodayScreen, null);else if (tab === 'leads') screen = /*#__PURE__*/React.createElement(LeadsScreenM, {
    onOpenLead: setLead
  });else if (tab === 'new') screen = /*#__PURE__*/React.createElement(ComposeScreen, {
    onDone: () => setTab('today')
  });else screen = /*#__PURE__*/React.createElement(TodayScreen, null);
  return /*#__PURE__*/React.createElement(MobileShell, {
    tab: tab,
    onTab: t => {
      setLead(null);
      setTab(t);
    }
  }, screen);
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(MobileApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/screens.jsx
try { (() => {
const {
  Card,
  Button,
  IconButton,
  Avatar,
  AvatarStack,
  Badge,
  Tag,
  StatBlock,
  FilterChip,
  SelectPill,
  SearchField,
  Input,
  Checkbox,
  InterestScale,
  ProgressTrack,
  Icon,
  SectionHeader
} = window.SoftNatureDesignSystem_879b9a;
const D = window.WS_DATA;
function TodayScreen({
  onOpenLead
}) {
  const [f, setF] = React.useState('All');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "28 March"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) 26px/1.1 var(--font-display)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, "Your Day")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "Alerts"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Ron D",
    size: "md"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "34",
    label: "Deals",
    delta: "2"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "20",
    label: "won",
    delta: "2"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "3",
    label: "lost",
    delta: "1",
    direction: "down"
  })), /*#__PURE__*/React.createElement(Card, {
    tone: "ink",
    pad: "12px 14px",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'rgba(255,255,255,.6)'
    }
  }, "Next up \xB7 2:00 pm"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-title-s)/1.2 var(--font-display)',
      color: '#fff'
    }
  }, "Google Meet Call")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(AvatarStack, {
    size: "xs",
    people: [{
      name: 'P T'
    }, {
      name: 'A H'
    }]
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "video",
    variant: "accent",
    label: "Join"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-section)',
      color: 'var(--text-strong)'
    }
  }, "Tasks"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-strong)',
      borderBottom: '1.5px solid var(--lime-400)',
      paddingBottom: 2
    }
  }, "16 Tasks"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(SearchField, {
    collapsed: true
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      overflow: 'auto',
      paddingBottom: 2
    }
  }, ['All', 'Hot', 'Due Today', 'Overdue', 'Completed'].map(i => /*#__PURE__*/React.createElement(FilterChip, {
    key: i,
    active: f === i,
    onClick: () => setF(i),
    dotColor: i === 'Hot' ? 'var(--status-hot)' : undefined
  }, i))), D.tasks.slice(0, 3).map((t, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: t.live ? 'accent' : 'white',
    interactive: true,
    pad: "14px",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: t.who,
    size: "sm",
    ring: t.live
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-body-s)/1.3 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, t.who), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: t.live ? 'rgba(14,15,16,.6)' : 'var(--text-faint)'
    }
  }, t.when)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-right",
    size: "sm",
    variant: t.live ? 'plain' : 'quiet',
    label: "Open"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-title-m)/1.2 var(--font-display)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, t.title), /*#__PURE__*/React.createElement(SelectPill, {
    value: t.status,
    options: ['Call scheduled', 'Waiting Proposal', 'Completed'],
    leading: /*#__PURE__*/React.createElement(Avatar, {
      name: t.who,
      size: "xs"
    })
  })))));
}
function LeadsScreenM({
  onOpenLead
}) {
  const [q, setQ] = React.useState('');
  const rows = D.leads.filter(l => l.name.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) 26px/1.1 var(--font-display)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, "Leads"), /*#__PURE__*/React.createElement(SearchField, {
    placeholder: "Search leads",
    value: q,
    onChange: e => setQ(e.target.value)
  }), rows.map(l => /*#__PURE__*/React.createElement(Card, {
    key: l.name,
    interactive: true,
    pad: "14px",
    onClick: () => onOpenLead(l),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: l.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)'
    }
  }, l.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, l.role)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: l.tone,
    dot: l.tone !== 'neutral'
  }, l.badge), /*#__PURE__*/React.createElement(InterestScale, {
    level: l.level,
    size: 7
  })))), !rows.length && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 0',
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-faint)'
    }
  }, "No leads match that search"));
}
function LeadDetailScreen({
  lead,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    onClick: onBack,
    label: "Back"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "pencil",
    label: "Edit"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "more-horizontal",
    label: "More"
  }))), /*#__PURE__*/React.createElement(Card, {
    pad: "20px",
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: lead.name,
    size: "xl"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) 22px/1.2 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, lead.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-muted)'
    }
  }, lead.role), /*#__PURE__*/React.createElement(Badge, {
    tone: lead.tone,
    dot: lead.tone !== 'neutral'
  }, lead.badge), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: "phone",
    size: "sm"
  }, "Call"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconLeft: "mail",
    size: "sm"
  }, "Email"), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    iconLeft: "calendar",
    size: "sm"
  }, "Book"))), /*#__PURE__*/React.createElement(Card, {
    pad: "16px",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "Source"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, lead.sources.map(s => /*#__PURE__*/React.createElement(Tag, {
    key: s
  }, s))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "Interest"), /*#__PURE__*/React.createElement(InterestScale, {
    level: lead.level,
    label: lead.badge
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "Deal progress"), /*#__PURE__*/React.createElement(ProgressTrack, {
    value: lead.level * 18
  })), /*#__PURE__*/React.createElement(Card, {
    pad: "16px",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-section)',
      color: 'var(--text-strong)'
    }
  }, "Activity"), [['Call scheduled', '28.03.2023 at 2 pm'], ['Proposal sent', '26.03.2023'], ['Lead created', '21.03.2023']].map(([t, d]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: 'var(--lime-400)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-body)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, d)))));
}
function ComposeScreen({
  onDone
}) {
  const [title, setTitle] = React.useState('');
  const [remind, setRemind] = React.useState(true);
  const [status, setStatus] = React.useState('Call scheduled');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) 26px/1.1 var(--font-display)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, "New Task"), /*#__PURE__*/React.createElement(Card, {
    pad: "16px",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Title",
    placeholder: "Google Meet Call",
    value: title,
    onChange: e => setTitle(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "When",
    icon: "calendar",
    placeholder: "28.03.2023 at 2 pm"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Amount",
    icon: "dollar-sign",
    placeholder: "20 000"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)',
      paddingLeft: 14
    }
  }, "Status"), /*#__PURE__*/React.createElement(SelectPill, {
    value: status,
    onChange: setStatus,
    options: ['Call scheduled', 'Waiting Proposal', 'Overdue', 'Completed'],
    leading: /*#__PURE__*/React.createElement(Avatar, {
      name: "P T",
      size: "xs"
    })
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: remind,
    onChange: setRemind,
    label: "Remind me 15 min before"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    full: true,
    onClick: onDone
  }, "Create Task"));
}
Object.assign(window, {
  TodayScreen,
  LeadsScreenM,
  LeadDetailScreen,
  ComposeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/CallOverlay.jsx
try { (() => {
const {
  Card,
  IconButton,
  Avatar,
  Icon,
  ProgressTrack
} = window.SoftNatureDesignSystem_879b9a;
function CallOverlay({
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 18,
      top: 86,
      width: 250,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "ink",
    pad: "10px",
    radius: "var(--radius-xl)",
    style: {
      boxShadow: 'var(--elevation-modal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 150,
      borderRadius: 'var(--radius-lg)',
      background: 'linear-gradient(180deg,#3B4038,#23261F)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Peter Thomas",
    size: 72,
    style: {
      marginBottom: 18,
      background: 'rgba(255,255,255,.12)',
      color: '#fff'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "maximize-2",
    size: "sm",
    variant: "quiet",
    style: {
      background: 'rgba(255,255,255,.14)',
      color: '#fff'
    },
    label: "Expand"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "x",
    size: "sm",
    variant: "quiet",
    style: {
      background: 'rgba(255,255,255,.14)',
      color: '#fff'
    },
    onClick: onClose,
    label: "Close"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: 10,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-ink)',
      color: '#fff',
      font: 'var(--weight-semibold) var(--size-nano)/1.5 var(--font-sans)'
    }
  }, "Peter Thomas")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "video",
    size: "sm",
    variant: "quiet",
    style: {
      background: 'rgba(255,255,255,.12)',
      color: '#fff'
    },
    label: "Camera"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "mic",
    size: "sm",
    variant: "quiet",
    style: {
      background: 'rgba(255,255,255,.12)',
      color: '#fff'
    },
    label: "Mic"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "monitor-up",
    size: "sm",
    variant: "quiet",
    style: {
      background: 'rgba(255,255,255,.12)',
      color: '#fff'
    },
    label: "Share"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "phone",
    size: "sm",
    variant: "danger",
    onClick: onClose,
    label: "Hang up"
  }))), /*#__PURE__*/React.createElement(Card, {
    tone: "ink",
    pad: "14px",
    radius: "var(--radius-xl)",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: 'var(--elevation-modal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-title-m)/1.2 var(--font-display)',
      color: '#fff'
    }
  }, "Summary"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-up-right",
    size: "sm",
    variant: "quiet",
    style: {
      background: 'rgba(255,255,255,.12)',
      color: '#fff'
    },
    label: "Open summary"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,.07)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: '#fff'
    }
  }, "Documents:"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'rgba(255,255,255,.6)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, [0, 1].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: 70,
      borderRadius: 'var(--radius-sm)',
      background: '#fff',
      padding: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, [100, 86, 92, 70, 60].map((w, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    style: {
      height: 3,
      width: w + '%',
      borderRadius: 2,
      background: 'var(--neutral-200)'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,.07)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: '#fff'
    }
  }, "Goal:"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'rgba(255,255,255,.6)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 13
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-regular) var(--size-micro)/1.6 var(--font-sans)',
      color: 'rgba(255,255,255,.62)'
    }
  }, "Reduce the number of security incidents by 50%. This goal is quantitative and measurable, and it would have a significant impact on the business."), /*#__PURE__*/React.createElement(ProgressTrack, {
    value: 42,
    style: {
      background: 'rgba(255,255,255,.12)'
    }
  }))));
}
Object.assign(window, {
  CallOverlay
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/CallOverlay.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/LeadCard.jsx
try { (() => {
const {
  Card,
  Avatar,
  IconButton,
  Badge,
  Tag,
  InterestScale
} = window.SoftNatureDesignSystem_879b9a;
function LeadCard({
  lead,
  width = 236
}) {
  return /*#__PURE__*/React.createElement(Card, {
    interactive: true,
    style: {
      width,
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '14px 16px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: lead.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-up-right",
    size: "sm",
    label: "Open"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)'
    }
  }, lead.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-muted)'
    }
  }, lead.role)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, "Source"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: lead.tone,
    dot: lead.tone !== 'neutral'
  }, lead.badge))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, lead.sources.map(s => /*#__PURE__*/React.createElement(Tag, {
    key: s
  }, s)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(InterestScale, {
    level: lead.level
  }))));
}
Object.assign(window, {
  LeadCard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/LeadCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/TaskCard.jsx
try { (() => {
const {
  Avatar,
  IconButton,
  SelectPill
} = window.SoftNatureDesignSystem_879b9a;
const TAB = 44,
  SLOT = 56,
  R = 26,
  RI = 16;
function TaskCard({
  task,
  width = 252
}) {
  const live = task.live;
  const [hover, setHover] = React.useState(false);
  const bg = live ? 'var(--surface-accent)' : 'var(--surface-card)';
  const ink = live ? 'var(--ink-900)' : 'var(--text-strong)';
  const sub = live ? 'rgba(14,15,16,.6)' : 'var(--text-faint)';
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      width,
      flex: 'none',
      transition: 'var(--transition-hover)',
      transform: hover ? 'translateY(-2px)' : 'none',
      cursor: 'pointer',
      filter: hover ? 'drop-shadow(0 6px 20px rgba(14,15,16,.10))' : 'drop-shadow(0 2px 8px rgba(14,15,16,.06))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: TAB
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: bg,
      borderRadius: `${R}px ${RI}px 0 0`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: SLOT,
      flex: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: TAB,
      width: `calc(100% - ${SLOT}px)`,
      height: RI,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: RI,
      height: RI,
      background: bg,
      WebkitMaskImage: `radial-gradient(circle ${RI}px at 100% 100%, transparent ${RI - 0.5}px, #000 ${RI}px)`,
      maskImage: `radial-gradient(circle ${RI}px at 100% 100%, transparent ${RI - 0.5}px, #000 ${RI}px)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: `0 ${RI}px ${R}px ${R}px`,
      marginTop: -1,
      padding: '6px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: -TAB + 2,
      paddingRight: SLOT - 8,
      height: TAB - 8
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: task.who,
    size: "sm",
    ring: live
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-body-s)/1.3 var(--font-display)',
      color: ink
    }
  }, task.who), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: sub
    }
  }, task.role))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-title-m)/1.2 var(--font-display)',
      letterSpacing: 'var(--track-tight)',
      color: ink
    }
  }, task.title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: live ? 'rgba(14,15,16,.65)' : 'var(--text-muted)'
    }
  }, task.when)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: live ? 'rgba(14,15,16,.55)' : 'var(--text-faint)'
    }
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(SelectPill, {
    value: task.status,
    options: ['Call scheduled', 'Waiting Proposal', 'Overdue', 'Completed'],
    leading: /*#__PURE__*/React.createElement(Avatar, {
      name: task.who,
      size: "xs"
    })
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "mail",
    size: "sm",
    variant: "quiet",
    label: "Email"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "message-square",
    size: "sm",
    variant: "ink",
    label: "Message"
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-up-right",
    size: "md",
    variant: "ink",
    label: "Open task",
    style: {
      width: TAB,
      height: TAB
    }
  })));
}
Object.assign(window, {
  TaskCard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/TaskCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/WorkspaceShell.jsx
try { (() => {
const {
  SidebarRail,
  IconButton,
  Avatar,
  AvatarStack,
  PillBar,
  Icon
} = window.SoftNatureDesignSystem_879b9a;
function ScheduleCapsule() {
  return /*#__PURE__*/React.createElement(PillBar, {
    style: {
      flex: 1,
      minWidth: 0,
      padding: '6px 8px',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      padding: '0 6px 0 12px'
    }
  }, "Your Schedule"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 12px',
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(255,255,255,.10)',
      font: 'var(--type-micro)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 13
  }), "28 March"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 20,
      background: 'var(--line-on-ink)',
      margin: '0 4px'
    }
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "R L",
    size: "sm",
    ring: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(255,255,255,.10)',
      font: 'var(--type-micro)'
    }
  }, "36 min", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    size: 12
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      padding: '0 6px',
      color: 'rgba(255,255,255,.75)'
    }
  }, "2:00 pm"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '5px 8px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-accent)',
      color: 'var(--text-on-accent)'
    }
  }, /*#__PURE__*/React.createElement(AvatarStack, {
    size: "xs",
    people: [{
      name: 'A B'
    }, {
      name: 'C D'
    }]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      background: '#fff',
      font: 'var(--weight-semibold) var(--size-nano)/1.4 var(--font-sans)'
    }
  }, "2:15 pm"), /*#__PURE__*/React.createElement(Icon, {
    name: "bar-chart-2",
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      padding: '0 6px',
      color: 'rgba(255,255,255,.75)'
    }
  }, "3:00 pm"), /*#__PURE__*/React.createElement(AvatarStack, {
    size: "xs",
    people: [{
      name: 'E F'
    }, {
      name: 'G H'
    }]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-pill)',
      background: 'rgba(255,255,255,.10)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 14
  })));
}
function WorkspaceShell({
  tab,
  onTab,
  children,
  onCall
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface-app)',
      borderRadius: 'var(--radius-screen)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 22px 8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: 'var(--weight-bold) 15px/1 var(--font-display)',
      letterSpacing: '.02em',
      color: 'var(--text-strong)'
    }
  }, "SN"), /*#__PURE__*/React.createElement(ScheduleCapsule, null), /*#__PURE__*/React.createElement(IconButton, {
    icon: "refresh-cw",
    label: "Refresh"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Ron D",
    size: "md"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
      padding: '14px 10px 22px 18px'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Back"
  }), /*#__PURE__*/React.createElement(SidebarRail, {
    activeId: tab,
    onSelect: onTab,
    style: {
      gap: 8,
      background: 'transparent'
    },
    items: [{
      id: 'overview',
      icon: 'layout-grid',
      label: 'Overview'
    }, {
      id: 'leads',
      icon: 'users',
      label: 'Leads'
    }, {
      id: 'tasks',
      icon: 'message-circle',
      label: 'Tasks'
    }, {
      id: 'calendar',
      icon: 'calendar',
      label: 'Calendar'
    }]
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "video",
    variant: "ink",
    label: "Start call",
    onClick: onCall
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'auto',
      padding: '6px 26px 30px 6px'
    }
  }, children)));
}
Object.assign(window, {
  WorkspaceShell,
  ScheduleCapsule
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/WorkspaceShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/app.jsx
try { (() => {
const {
  Card,
  Button,
  Input,
  IconButton,
  Checkbox
} = window.SoftNatureDesignSystem_879b9a;
function NewTaskModal({
  onClose
}) {
  const [title, setTitle] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-overlay)',
      backdropFilter: 'var(--blur-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      borderRadius: 'var(--radius-screen)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    onClick: e => e.stopPropagation(),
    pad: "24px",
    style: {
      width: 380,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      boxShadow: 'var(--elevation-modal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-section)',
      color: 'var(--text-strong)'
    }
  }, "New Task"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "x",
    size: "sm",
    variant: "quiet",
    onClick: onClose,
    label: "Close"
  }))), /*#__PURE__*/React.createElement(Input, {
    label: "Title",
    placeholder: "Google Meet Call",
    value: title,
    onChange: e => setTitle(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "When",
    icon: "calendar",
    placeholder: "28.03.2023 at 2 pm"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    label: "Remind me 15 min before"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    full: true,
    onClick: onClose
  }, "Create Task"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose
  }, "Cancel"))));
}
function App() {
  const [tab, setTab] = React.useState('overview');
  const [call, setCall] = React.useState(true);
  const [modal, setModal] = React.useState(false);
  const Screen = {
    overview: OverviewScreen,
    leads: LeadsScreen,
    tasks: TasksScreen,
    calendar: CalendarScreen
  }[tab];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 1440,
      height: 900,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(WorkspaceShell, {
    tab: tab,
    onTab: setTab,
    onCall: () => setCall(true)
  }, /*#__PURE__*/React.createElement(Screen, {
    onNewTask: () => setModal(true)
  })), call && /*#__PURE__*/React.createElement(CallOverlay, {
    onClose: () => setCall(false)
  }), modal && /*#__PURE__*/React.createElement(NewTaskModal, {
    onClose: () => setModal(false)
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/data.js
try { (() => {
window.WS_DATA = {
  leads: [{
    name: 'Jane Doe',
    role: 'Marketing Director at Microsoft',
    sources: ['Linkedin', 'Email'],
    badge: 'Hot Client',
    tone: 'hot',
    level: 5
  }, {
    name: 'Darlene Robertson',
    role: 'Financial Manager at Ford',
    sources: ['Linkedin', 'Facebook'],
    badge: 'High interest',
    tone: 'warm',
    level: 4
  }, {
    name: 'Wade Warren',
    role: 'Operations Manager at Zenith',
    sources: ['Typeform'],
    badge: 'Medium interest',
    tone: 'due',
    level: 3
  }, {
    name: 'Jonah Jude',
    role: 'Web Developer at Binary Bulls',
    sources: ['Spartem'],
    badge: 'Low interest',
    tone: 'neutral',
    level: 2
  }, {
    name: 'Cody Fisher',
    role: 'Head of Growth at Northwind',
    sources: ['Linkedin'],
    badge: 'Great interest',
    tone: 'won',
    level: 4
  }, {
    name: 'Esther Howard',
    role: 'Procurement Lead at Hallmark',
    sources: ['Email'],
    badge: 'Non interested',
    tone: 'neutral',
    level: 1
  }],
  tasks: [{
    title: 'Google Meet Call',
    who: 'Peter Thomas',
    role: 'CEO of Maskeria',
    when: '28.03.2023 at 2 pm',
    status: 'Call scheduled',
    live: true
  }, {
    title: 'Send Proposal',
    who: 'Alisha Hyacinth',
    role: 'CEO at Helionpress',
    when: 'Amount  $ 20 000',
    status: 'Waiting Proposal'
  }, {
    title: 'Google Meet Call',
    who: 'Miriam Fannia',
    role: 'Brand Manager at Summit Marketing',
    when: '28.03.2023 at 8 pm',
    status: 'Call scheduled'
  }, {
    title: 'Follow-up Email',
    who: 'Guy Hawkins',
    role: 'Sales Lead at Pinebark',
    when: '29.03.2023 at 10 am',
    status: 'Overdue'
  }],
  schedule: [{
    time: '2:00 pm',
    len: '36 min'
  }, {
    time: '3:00 pm',
    len: '25 min'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/data.js", error: String((e && e.message) || e) }); }

// ui_kits/workspace/screens.jsx
try { (() => {
const {
  Button,
  IconButton,
  SearchField,
  SectionHeader,
  FilterChip,
  StatBlock,
  Card,
  Avatar,
  Badge,
  Tag,
  InterestScale,
  Checkbox
} = window.SoftNatureDesignSystem_879b9a;
const D = window.WS_DATA;
function ChipRow({
  items,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6,
      overflow: 'hidden'
    }
  }, items.map(i => /*#__PURE__*/React.createElement(FilterChip, {
    key: i,
    active: value === i,
    onClick: () => onChange(i),
    dotColor: i === 'Hot Client' || i === 'Hot' ? 'var(--status-hot)' : undefined
  }, i)));
}
function PageHead({
  onNewTask
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 26,
      padding: '12px 0 26px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) 40px/1 var(--font-display)',
      letterSpacing: 'var(--track-wordmark)',
      color: 'var(--text-strong)'
    }
  }, "WORKSPACE"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: "plus",
    onClick: onNewTask
  }, "New Task"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 34,
      marginLeft: 'auto',
      paddingRight: 8
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "34",
    label: "Deals",
    delta: "2"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "20",
    label: "won",
    delta: "2"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "3",
    label: "lost",
    delta: "1",
    direction: "down"
  })));
}
function OverviewScreen({
  onNewTask
}) {
  const [lf, setLf] = React.useState('All');
  const [tf, setTf] = React.useState('All');
  const leads = lf === 'All' ? D.leads : D.leads.filter(l => l.badge === lf);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement(PageHead, {
    onNewTask: onNewTask
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "New Leads",
    count: `${leads.length} Leads`
  }, /*#__PURE__*/React.createElement(SearchField, {
    collapsed: true
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "sliders-horizontal",
    label: "Filters"
  }), /*#__PURE__*/React.createElement(ChipRow, {
    value: lf,
    onChange: setLf,
    items: ['All', 'Hot Client', 'Great interest', 'Medium interest', 'Low interest', 'Non interested']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      overflow: 'hidden',
      paddingBottom: 4
    }
  }, leads.map(l => /*#__PURE__*/React.createElement(LeadCard, {
    key: l.name,
    lead: l
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Your Days Tasks",
    count: "16 Tasks"
  }, /*#__PURE__*/React.createElement(SearchField, {
    collapsed: true
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "sliders-horizontal",
    label: "Filters"
  }), /*#__PURE__*/React.createElement(ChipRow, {
    value: tf,
    onChange: setTf,
    items: ['All', 'Hot', 'Due Today', 'Overdue', 'Completed']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      overflow: 'hidden',
      paddingBottom: 4
    }
  }, D.tasks.map((t, i) => /*#__PURE__*/React.createElement(TaskCard, {
    key: i,
    task: t
  })))));
}
function LeadsScreen() {
  const [q, setQ] = React.useState('');
  const [f, setF] = React.useState('All');
  const rows = D.leads.filter(l => l.name.toLowerCase().includes(q.toLowerCase()) && (f === 'All' || l.badge === f));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '12px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-page-title)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, "All Leads"), /*#__PURE__*/React.createElement(SearchField, {
    placeholder: "Search leads",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      width: 260
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    iconLeft: "plus"
  }, "New Lead"))), /*#__PURE__*/React.createElement(ChipRow, {
    value: f,
    onChange: setF,
    items: ['All', 'Hot Client', 'High interest', 'Great interest', 'Medium interest', 'Low interest', 'Non interested']
  }), /*#__PURE__*/React.createElement(Card, {
    pad: "0",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 40px',
      gap: 16,
      padding: '14px 20px',
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Lead"), /*#__PURE__*/React.createElement("span", null, "Source"), /*#__PURE__*/React.createElement("span", null, "Stage"), /*#__PURE__*/React.createElement("span", null, "Interest"), /*#__PURE__*/React.createElement("span", null)), rows.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: l.name,
    style: {
      display: 'grid',
      gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 40px',
      gap: 16,
      alignItems: 'center',
      padding: '14px 20px',
      borderTop: '1px solid var(--line-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: l.name,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-strong)'
    }
  }, l.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, l.role))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, l.sources.map(s => /*#__PURE__*/React.createElement(Tag, {
    key: s
  }, s))), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Badge, {
    tone: l.tone,
    dot: l.tone !== 'neutral'
  }, l.badge)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(InterestScale, {
    level: l.level
  })), /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-up-right",
    size: "sm",
    label: "Open"
  }))), !rows.length && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 20px',
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-faint)',
      borderTop: '1px solid var(--line-hairline)'
    }
  }, "No leads match that filter")));
}
function TasksScreen() {
  const cols = [['Today', D.tasks.slice(0, 2)], ['This week', D.tasks.slice(2, 3)], ['Done', D.tasks.slice(3)]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '12px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-page-title)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, "Tasks"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    iconLeft: "plus"
  }, "New Task"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 16,
      alignItems: 'start'
    }
  }, cols.map(([title, items]) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-section)',
      color: 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, items.length)), items.map((t, i) => /*#__PURE__*/React.createElement(TaskCard, {
    key: i,
    task: t,
    width: "100%"
  })), /*#__PURE__*/React.createElement(Card, {
    tone: "sunken",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--text-faint)',
      font: 'var(--type-label)',
      cursor: 'pointer'
    }
  }, "+ Add task")))));
}
function CalendarScreen() {
  const hours = ['9 am', '10 am', '11 am', '12 pm', '1 pm', '2 pm', '3 pm', '4 pm'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '12px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-page-title)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text-strong)'
    }
  }, "28 March"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-left",
    label: "Previous"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-right",
    label: "Next"
  }))), /*#__PURE__*/React.createElement(Card, {
    pad: "20px",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, hours.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      minHeight: 52,
      borderTop: i ? '1px solid var(--line-hairline)' : 'none',
      paddingTop: i ? 8 : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 54,
      font: 'var(--type-micro)',
      color: 'var(--text-faint)'
    }
  }, h), h === '2 pm' && /*#__PURE__*/React.createElement(Card, {
    tone: "accent",
    pad: "10px 14px",
    radius: "var(--radius-md)",
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-body)/1.2 var(--font-display)'
    }
  }, "Google Meet Call"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'rgba(14,15,16,.65)'
    }
  }, "Peter Thomas \xB7 36 min")), h === '11 am' && /*#__PURE__*/React.createElement(Card, {
    pad: "10px 14px",
    radius: "var(--radius-md)",
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--weight-semibold) var(--size-body)/1.2 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, "Send Proposal"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-micro)',
      color: 'var(--text-muted)'
    }
  }, "Alisha Hyacinth"))))));
}
Object.assign(window, {
  OverviewScreen,
  LeadsScreen,
  TasksScreen,
  CalendarScreen,
  PageHead,
  ChipRow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.AvatarStack = __ds_scope.AvatarStack;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.InterestScale = __ds_scope.InterestScale;

__ds_ns.ProgressTrack = __ds_scope.ProgressTrack;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.SelectPill = __ds_scope.SelectPill;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.PillBar = __ds_scope.PillBar;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.SidebarRail = __ds_scope.SidebarRail;

})();
