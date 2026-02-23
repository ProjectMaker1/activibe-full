// frontend/src/components/CampaignCard.jsx
import React, { useMemo } from 'react';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';

function CampaignCard({ campaign, onClick }) {
  const countryOptions = useMemo(() => countryList().getData(), []);
const pickCountries = (c) => {
  const arr = Array.isArray(c?.countries) ? c.countries.filter(Boolean) : [];
  if (arr.length) return arr;
  return c?.country ? [c.country] : [];
};

const selectedCountries = useMemo(
  () => pickCountries(campaign),
  [campaign]
);

const countryMetas = useMemo(() => {
  return selectedCountries
    .map((code) => countryOptions.find((c) => c.value === code) || { value: code, label: code })
    .filter(Boolean);
}, [selectedCountries, countryOptions]);

const cardCountries = countryMetas.slice(0, 3);
const hasMoreCountries = countryMetas.length > 3;

const format = (d) => (d ? new Date(d).toLocaleDateString() : '');
const truncateWords = (text, maxWords) => {
  const t = (text || '').trim();
  if (!t) return '';
  const words = t.split(/\s+/);
  if (words.length <= maxWords) return t;
  return words.slice(0, maxWords).join(' ') + '...';
};

const dateLabel = campaign.startDate
  ? campaign.isOngoing
? `${format(campaign.startDate)}`
    : campaign.endDate
      ? `${format(campaign.startDate)} — ${format(campaign.endDate)}`
      : format(campaign.startDate)
  : null;


  return (
    <div
      className="campaign-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
<div className="campaign-image-wrapper">
  {campaign.imageUrl ? (
    <img
      src={campaign.imageUrl}
      alt={campaign.title}
      className="campaign-image"
    />
  ) : null}
</div>


      <div className="campaign-card-body">
<h3 title={campaign.title}>{truncateWords(campaign.title, 8)}</h3>

<p className="campaign-description" title={campaign.description}>
  {truncateWords(campaign.description, 15)}
</p>

        {/* Topic / Sub-topic tags */}
<div className="campaign-tags">
  {(Array.isArray(campaign.topics) ? campaign.topics : []).slice(0, 3).map((t) => (
    <span key={`t-${t}`} className="tag">{t}</span>
  ))}

  {(Array.isArray(campaign.subtopics) ? campaign.subtopics : []).slice(0, 2).map((s) => (
    <span key={`s-${s}`} className="tag tag-muted">{s}</span>
  ))}

  {((Array.isArray(campaign.topics) ? campaign.topics.length : 0) > 3) && (
    <span className="tag tag-more">+{campaign.topics.length - 3}</span>
  )}
</div>


        {/* Country + Date row */}
        <div
          className="campaign-card-meta"
          style={{
            marginTop: 'auto',

            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
{cardCountries.length > 0 && (
  <div
    className="campaign-card-country"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      minWidth: 0,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}
    title={countryMetas.map((c) => c.label).join(', ')}
  >
    {cardCountries.map((cm) => (
      <span
        key={cm.value}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        <span className={`fi fi-${String(cm.value).toLowerCase()}`} />
      </span>
    ))}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {cardCountries.map((c) => c.label).join(', ')}
      {hasMoreCountries ? '…' : ''}
    </span>
  </div>
)}

{campaign.startDate && (
  <span className={`campaign-card-date ${campaign.isOngoing ? 'ongoing' : ''}`}>
    {format(campaign.startDate)}
    {campaign.isOngoing ? (
      <span className="ongoing-pill">Ongoing</span>
    ) : campaign.endDate ? (
      <> — {format(campaign.endDate)}</>
    ) : null}
  </span>
)}


        </div>
      </div>
    </div>
  );
}

export default CampaignCard;
