export function getMetaBadgeStyle(isBackendMeta) {
  return {
    display: 'inline-block',
    marginLeft: '0.4rem',
    padding: '0.05rem 0.4rem',
    borderRadius: 12,
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: isBackendMeta ? '#e6f4ea' : '#fff4e5',
    color: isBackendMeta ? '#1e6f43' : '#8a5a00',
    border: `1px solid ${isBackendMeta ? '#b7dfc2' : '#ffd59a'}`
  };
}
