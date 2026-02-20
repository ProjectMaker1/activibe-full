// frontend/src/routes/CampaignsPage.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';import CampaignCard from '../components/CampaignCard.jsx';
import CampaignModal from '../components/CampaignModal.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';

import Select from 'react-select';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';
import Loader from '../components/Loader.jsx';

const PAGE_SIZE = 30;

function CampaignsPage() {
  const { tokens, isAdmin } = useAuth();   // 👈 ეს ხაზი უნდა დაემატოს აქვე
  const navigate = useNavigate();
  const { id } = useParams();
  const selectedIdFromUrl = id ? Number(id) : null;

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  // search + filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState(null); // { value, label } ან null
  const [filterTopic, setFilterTopic] = useState('');
  const [filterTool, setFilterTool] = useState('');

  // categories data (topics + tools)
  const [topics, setTopics] = useState([]);
  const [tools, setTools] = useState([]);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
const topRef = useRef(null);

const scrollPageTop = () => {
  topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // fallback desktop-ზე
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.querySelector(".app-main");
  if (main) main.scrollTop = 0;
};
  const countryOptions = useMemo(() => countryList().getData(), []);

  // load campaigns
  useEffect(() => {
    apiRequest('/campaigns')
      .then((data) => setCampaigns(data.campaigns || []))
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  // load topics/tools for filters
useEffect(() => {
  apiRequest('/categories')
    .then((res) => {
      // პირდაპირ backend order-ს ვიყენებთ
      setTopics(res.topics ?? []);
      setTools(res.tools ?? []);
    })

      .catch((err) => {
        console.error('Failed to load categories', err);
      });
  }, []);

  // URL -> selected (deep link support)
  useEffect(() => {
    if (!selectedIdFromUrl) return;
    const found = campaigns.find((c) => c.id === selectedIdFromUrl) || null;
    setSelected(found);
  }, [selectedIdFromUrl, campaigns]);

  // if URL has no id, ensure modal is closed
  useEffect(() => {
    if (!selectedIdFromUrl && selected) {
      setSelected(null);
    }
  }, [selectedIdFromUrl]);

  // filter change helpers
  const handleTopicChange = (e) => {
    const name = e.target.value;
    setFilterTopic(name);
  
    setCurrentPage(1);
  };



  const handleToolChange = (e) => {
    const name = e.target.value;
    setFilterTool(name);
    setCurrentPage(1);
  };


  const handleCountryChange = (option) => {
    setFilterCountry(option || null); // null = All
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const pickName = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.name || v.title || v.label || '';
    return '';
  };

  const toNameArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(pickName).filter(Boolean);
    const one = pickName(v);
    return one ? [one] : [];
  };

  const normalize = (s) => (s || '').toString().trim().toLowerCase();

const matchesAny = (items, selected) => {
  const sel = normalize(selected);
  if (!sel) return true;
  return (items || []).map(normalize).some((x) => x === sel);
};

  const handleDeleteCampaign = async (id) => {
    // უსაფრთხოება — თუ არ არის ადმინი ან არ აქვს ტოკენი, არაფერს ვაკეთებთ
    if (!isAdmin || !tokens?.accessToken) return;

    try {
      await apiRequest(
        `/admin/campaigns/${id}`,
        withAuth(tokens.accessToken, { method: 'DELETE' })
      );

      // წავშალოთ კამპანია ლოკალური სიიდან
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      // დავხუროთ მოდალი + URL დავაბრუნოთ
      setSelected(null);
      navigate('/campaigns');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete campaign');
    }
  };



  // filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // search by title or description
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const title = c.title?.toLowerCase() || '';
        const desc = c.description?.toLowerCase() || '';
        if (!title.includes(s) && !desc.includes(s)) return false;
      }
      // tools filter (robust)
      if (filterTool) {
        const campaignTools = toNameArray(c.tools); // supports string/array/object

        const toolObj = tools.find((t) => t.name === filterTool);
        const groupNames = [
          filterTool,
          ...(toolObj?.subTools || []).map((st) => st.name),
        ].map(normalize);

        const campaignToolNames = campaignTools.map(normalize);

        const matchesTool = campaignToolNames.some((ct) => groupNames.includes(ct));
        if (!matchesTool) return false;
      }

      // country filter
      if (filterCountry && c.country !== filterCountry.value) {
        return false;
      }

 // topic filter (any-of, supports string/array/object + common keys)
if (filterTopic) {
  const campaignTopics = [
    ...toNameArray(c.topic),
    ...toNameArray(c.topics),
    ...toNameArray(c.topicName),
    ...toNameArray(c.topicNames),
    ...toNameArray(c.categories),
  ].filter(Boolean);

  if (!matchesAny(campaignTopics, filterTopic)) return false;
}



      return true;
    });
  }, [
    campaigns,
    searchTerm,
    filterCountry,
    filterTopic,
    filterTool,
    tools,
  ]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedCampaigns = filteredCampaigns.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  if (loading) {
    return <Loader />;
  }

return (
  <div className="page campaigns-page">
    <div ref={topRef} />
      <section className="page-header">
        <h1>Find Your Cause</h1>
        <p>
          Explore campaigns and join the movement for non-violent action. Your
          voice matters.
        </p>
      </section>

      {/* Search + filters */}
      <section className="campaigns-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search for a campaign by title or keyword..."
          value={searchTerm}
          onChange={handleSearchChange}
        />

        <div className="filter-row" style={{ marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.6rem' }}>
          {/* Country (react-select, all countries, with flags) */}
          <div style={{ minWidth: 200, maxWidth: 260 }}>
            <Select
              options={countryOptions}
              value={filterCountry}
              onChange={handleCountryChange}
              placeholder="Country (all)"
              isClearable
              classNamePrefix="react-select"
              formatOptionLabel={(option) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    className={`fi fi-${option.value.toLowerCase()}`}
                  />
                  <span>{option.label}</span>
                </div>
              )}
            />
          </div>

          {/* Topic */}
          <select
            className="filter-pill"
            value={filterTopic}
            onChange={handleTopicChange}
          >
            <option value="">Topic (all)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>


          {/* Tools */}
          <select
            className="filter-pill"
            value={filterTool}
            onChange={handleToolChange}
          >
            <option value="">Tools (all)</option>
            {tools.map((tool) => (
              <option key={tool.id} value={tool.name}>
                {tool.name}
              </option>
            ))}
          </select>

        </div>
      </section>

      {/* Campaigns list */}
      <section className="campaigns-list">
        {!loading && filteredCampaigns.length === 0 && (
          <p>No campaigns match your filters.</p>
        )}

        <div className="campaigns-grid">
          {paginatedCampaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onClick={() => {
                setSelected(c);
                navigate(`/campaigns/${c.id}`);
              }}
            />
          ))}
        </div>

        {/* Pagination */}
        {!loading && filteredCampaigns.length > 0 && (
          <div
            className="pagination"
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
            }}
          >
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
 onClick={() => {
  setCurrentPage(page);

  requestAnimationFrame(() => scrollPageTop());
  setTimeout(scrollPageTop, 0);
}}

                  style={{
                    minWidth: 32,
                    padding: '0.3rem 0.6rem',
                    borderRadius: 999,
                    border:
                      page === currentPage
                        ? '1px solid #0c7b61'
                        : '1px solid #e5e7eb',
                    background:
                      page === currentPage ? '#0c7b61' : '#ffffff',
                    color: page === currentPage ? '#ffffff' : '#374151',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {page}
                </button>
              )
            )}
          </div>
        )}
      </section>

      {/* Modal */}
      <CampaignModal
        campaign={selected}
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          navigate('/campaigns');
        }}
        isAdmin={isAdmin}
        onDelete={handleDeleteCampaign}
      />
    </div>
  );
}

export default CampaignsPage;