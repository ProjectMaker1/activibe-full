// frontend/src/routes/CampaignsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import CampaignCard from '../components/CampaignCard.jsx';
import CampaignModal from '../components/CampaignModal.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import Select from 'react-select';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';
import Loader from '../components/Loader.jsx';

const PAGE_SIZE = 30;

function CampaignsPage() {
  const { tokens, isAdmin } = useAuth();   // 👈 ეს ხაზი უნდა დაემატოს აქვე

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  // search + filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState(null); // { value, label } ან null
  const [filterTopic, setFilterTopic] = useState('');
  const [filterSubtopic, setFilterSubtopic] = useState('');
  const [filterTool, setFilterTool] = useState('');
  const [filterSubTool, setFilterSubTool] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // categories data (topics + tools)
  const [topics, setTopics] = useState([]);
  const [tools, setTools] = useState([]);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);

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
        setTopics(res.topics || []);
        setTools(res.tools || []);
      })
      .catch((err) => {
        console.error('Failed to load categories', err);
      });
  }, []);

  // topic/subtopic options
  const currentTopicObj = topics.find((t) => t.name === filterTopic) || null;
  const subtopicOptions = currentTopicObj?.subtopics || [];
  // tool/sub-tool options
  const currentToolObj = tools.find((t) => t.name === filterTool) || null;
  const subToolOptions = currentToolObj?.subTools || [];

  // filter change helpers
  const handleTopicChange = (e) => {
    const name = e.target.value;
    setFilterTopic(name);
    setFilterSubtopic('');
    setCurrentPage(1);
  };

  const handleSubtopicChange = (e) => {
    setFilterSubtopic(e.target.value);
    setCurrentPage(1);
  };

  const handleToolChange = (e) => {
    const name = e.target.value;
    setFilterTool(name);
    setFilterSubTool('');   // როცა tool იცვლება, sub-tool ი ქლინავდეს
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

  const handleDateFromChange = (e) => {
    setFilterDateFrom(e.target.value);
    setCurrentPage(1);
  };

  const handleDateToChange = (e) => {
    setFilterDateTo(e.target.value);
    setCurrentPage(1);
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
      // დავხუროთ მოდალი
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete campaign');
    }
  };

    const handleSubToolChange = (e) => {
    setFilterSubTool(e.target.value);
    setCurrentPage(1);
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

      // country filter
      if (filterCountry && c.country !== filterCountry.value) {
        return false;
      }

      // topic filter
      if (filterTopic && c.topic !== filterTopic) {
        return false;
      }

      // subtopic filter
      if (filterSubtopic && c.subtopic !== filterSubtopic) {
        return false;
      }

      // tools filter (by group)
      if (filterTool) {
        const toolObj = tools.find((t) => t.name === filterTool);
        if (toolObj) {
          const belongsToTool =
            (toolObj.subTools || []).some((st) => st.name === c.tools) ||
            c.tools === filterTool;

          if (!belongsToTool) return false;
        }
      }

      // sub-tool filter (exact match)
      if (filterSubTool && c.tools !== filterSubTool) {
        return false;
      }


      // date range filter
      if (filterDateFrom || filterDateTo) {
        if (!c.date) return false;
        const campaignDate = new Date(c.date);
        if (Number.isNaN(campaignDate.getTime())) return false;

        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          if (campaignDate < fromDate) return false;
        }

        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          // დღეც შევიყვანოთ შიგნით: if campaignDate > toDate + 1day? მარტივად ასე:
          toDate.setHours(23, 59, 59, 999);
          if (campaignDate > toDate) return false;
        }
      }

      return true;
    });
  }, [
    campaigns,
    searchTerm,
    filterCountry,
    filterTopic,
    filterSubtopic,
    filterTool,
    filterSubTool,
    filterDateFrom,
    filterDateTo,
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

          {/* Sub-topic */}
          <select
            className="filter-pill"
            value={filterSubtopic}
            onChange={handleSubtopicChange}
            disabled={!subtopicOptions.length}
          >
            <option value="">
              {subtopicOptions.length ? 'Sub-topic (all)' : 'Select topic first'}
            </option>
            {subtopicOptions.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
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
          {/* Sub-tools */}
          <select
            className="filter-pill"
            value={filterSubTool}
            onChange={handleSubToolChange}
            disabled={!subToolOptions.length}
          >
            <option value="">
              {subToolOptions.length ? 'Sub-tools (all)' : 'Select tool first'}
            </option>
            {subToolOptions.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Date range */}
          <div
            className="filter-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              paddingRight: '0.7rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#374151' }}>
              Date:
            </span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={handleDateFromChange}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                background: 'transparent',
              }}
            />
            <span style={{ fontSize: '0.8rem' }}>–</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={handleDateToChange}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.8rem',
                background: 'transparent',
              }}
            />
          </div>
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
              onClick={() => setSelected(c)}
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
                  onClick={() => setCurrentPage(page)}
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
        onClose={() => setSelected(null)}
        isAdmin={isAdmin}
        onDelete={handleDeleteCampaign}
      />

    </div>
  );
}

export default CampaignsPage;
