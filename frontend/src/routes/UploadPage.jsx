// frontend/src/routes/UploadPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import { validateRequired } from '@shared/validators.js';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';
import '../styles/upload.css';
import { useLocation, useNavigate } from 'react-router-dom';

function UploadPage() {
  const { tokens, user } = useAuth();
  const location = useLocation();
  const editCampaignId = location?.state?.editCampaignId ? Number(location.state.editCampaignId) : null;
  const isEditMode = !!editCampaignId;
const navigate = useNavigate();

  const [loadingEditCampaign, setLoadingEditCampaign] = useState(false);

  // Existing media (from DB) — edit mode only
  const [existingMedia, setExistingMedia] = useState([]); // [{id,url,kind,sourceType,sourceUrl}]
  const [keepMediaIds, setKeepMediaIds] = useState(new Set()); // ids to keep

  // 👉 ახალი: სათაური
  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [isOngoing, setIsOngoing] = useState(false);
  const [country, setCountry] = useState(null); // { label, value }
const [topics, setTopics] = useState([]);
const [subtopics, setSubtopics] = useState([]);
const [tools, setTools] = useState([]);
const [subTools, setSubTools] = useState([]);


  // dropdown data
  const [availableTopics, setAvailableTopics] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // progress bar
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const countryOptions = useMemo(() => countryList().getData(), []);

  // ბევრი ფაილი: [{ file: File, preview: string }]
const [files, setFiles] = useState([]);

useEffect(() => {
  return () => {
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
  };
}, [files]);

  // load topics + tools for dropdowns
useEffect(() => {
  if (!tokens?.accessToken) return;

  const loadCategories = async () => {
    try {
const res = await apiRequest(
  '/categories',   // ✅ ეს
  withAuth(tokens.accessToken)
);

      setAvailableTopics(res.topics ?? []);
      setAvailableTools(res.tools ?? []);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setCategoriesLoaded(true);
    }
  };

  loadCategories();
}, [tokens?.accessToken]);


const topicOptions = useMemo(
  () => (availableTopics ?? []).map(t => ({ value: t.name, label: t.name })),
  [availableTopics]
);

const toolOptions = useMemo(
  () => (availableTools ?? []).map(t => ({ value: t.name, label: t.name })),
  [availableTools]
);

const subtopicOptions = useMemo(() => {
  const map = new Map();

  topics.forEach(sel => {
    const topicObj = availableTopics.find(t => t.name === sel.value);
    (topicObj?.subtopics || []).forEach(st => {
      map.set(st.name, { value: st.name, label: st.name });
    });
  });

  return Array.from(map.values());
}, [topics, availableTopics]);

const subToolOptions = useMemo(() => {
  const map = new Map();

  tools.forEach(sel => {
    const toolObj = availableTools.find(t => t.name === sel.value);
    (toolObj?.subTools || []).forEach(st => {
      map.set(st.name, { value: st.name, label: st.name });
    });
  });

  return Array.from(map.values());
}, [tools, availableTools]);

  const toDateInputValue = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const tzOffset = dt.getTimezoneOffset() * 60000;
    const local = new Date(dt.getTime() - tzOffset);
    return local.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const loadEditCampaign = async () => {
      if (!isEditMode) return;
      if (!tokens?.accessToken) return;
      if (!categoriesLoaded) return;

      setLoadingEditCampaign(true);
      setStatus(null);
      try {
        const res = await apiRequest(
          `/admin/campaigns/${editCampaignId}`,
          withAuth(tokens.accessToken)
        );

        const c = res?.campaign;
        if (!c) {
          setStatus({ type: 'error', message: 'Campaign not found.' });
          return;
        }

        // fill simple fields
        setTitle(c.title || '');
        setDescription(c.description || '');
        setStartDate(toDateInputValue(c.startDate));
        setIsOngoing(!!c.isOngoing);
        setEndDate(c.isOngoing ? '' : toDateInputValue(c.endDate));

        // country select
        const foundCountry =
          c.country
            ? (countryOptions.find((opt) => opt.value === c.country) || { value: c.country, label: c.country })
            : null;
        setCountry(foundCountry);

        // selects expect {value,label}
        const tVals = (Array.isArray(c.topics) ? c.topics : []).map((x) => ({ value: x, label: x }));
        const stVals = (Array.isArray(c.subtopics) ? c.subtopics : []).map((x) => ({ value: x, label: x }));
        const toolVals = (Array.isArray(c.tools) ? c.tools : []).map((x) => ({ value: x, label: x }));
        const subToolVals = (Array.isArray(c.subTools) ? c.subTools : []).map((x) => ({ value: x, label: x }));

        setTopics(tVals);
        setSubtopics(stVals);
        setTools(toolVals);
        setSubTools(subToolVals);

        // existing media
        const mediaArr = Array.isArray(c.media) ? c.media : [];
        setExistingMedia(mediaArr);

        const keep = new Set(mediaArr.map((m) => m.id));
        setKeepMediaIds(keep);

        // clear new uploads (Edit prefills existing only)
        files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
        setFiles([]);

      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: err.message || 'Failed to load campaign.' });
      } finally {
        setLoadingEditCampaign(false);
      }
    };

    loadEditCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editCampaignId, tokens?.accessToken, categoriesLoaded]);

const handleFileChange = (e) => {
  const list = Array.from(e.target.files || []);
  if (!list.length) return;

  const next = [];

  for (const f of list) {
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      setStatus({
        type: 'error',
        message: 'Please select only image or video files.',
      });
      continue;
    }

    next.push({
      file: f,
      preview: URL.createObjectURL(f),
      sourceType: 'OWN',
      sourceUrl: '',
    });
  } // ✅ ეს } გაკლდა შენთან

  if (next.length) {
    setFiles((prev) => [...prev, ...next]);
    setStatus(null);
  }

  e.target.value = '';
};


  const handleRemoveFile = (index) => {
    setFiles((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return copy;
    });
  };
  const handleRemoveExistingMedia = (mediaId) => {
    setKeepMediaIds((prev) => {
      const next = new Set(prev);
      next.delete(mediaId);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setShowSuccessOverlay(false);

    if (!tokens?.accessToken) {
      setStatus({ type: 'error', message: 'You must be logged in to upload.' });
      return;
    }

    // ჯერ ვალიდაცია სათაურზე
    const titleError = validateRequired(title, 'Title');
    if (titleError) {
      setStatus({ type: 'error', message: titleError });
      return;
    }

    const descError = validateRequired(description, 'Description');
    if (descError) {
      setStatus({ type: 'error', message: descError });
      return;
    }

const hasExistingKept = isEditMode ? keepMediaIds.size > 0 : false;

if (!files.length && !hasExistingKept) {
  setStatus({
    type: 'error',
    message: 'Please upload at least one image or video.',
  });
  return;
}

const bad = files.find(
  (f) => f.sourceType === 'EXTERNAL' && !String(f.sourceUrl || '').trim()
);

if (bad) {
  setStatus({
    type: 'error',
    message: 'Please add a source link for every media marked as External.',
  });
  return;
}


if (!startDate) {
  setStatus({ type: 'error', message: 'Start date is required.' });
  return;
}

if (!isOngoing && endDate && new Date(endDate) < new Date(startDate)) {
  setStatus({ type: 'error', message: 'End date cannot be before start date.' });
  return;
}

    setSubmitting(true);
    setStatus(null);
    setUploadProgress(0);

    try {
      let imageUrl = null;
      let videoUrl = null;
      const mediaPayload = []; // ყველა media ჩანაწერი

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      // --- Upload with Progress helper ---
      const uploadFileWithProgress = (file, onProgress) =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();

          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);

          xhr.open(
            'POST',
            `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
          );

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const percent = Math.round((evt.loaded / evt.total) * 100);
              onProgress(percent);
            }
          };

          xhr.onload = () =>
            xhr.status === 200
              ? resolve(JSON.parse(xhr.responseText))
              : reject(new Error('Cloudinary upload failed'));

          xhr.onerror = () => reject(new Error('Upload error'));
          xhr.send(formData);
        });

// ყველა ფაილის ატვირთვა Cloudinary-ზე (ჯამური progress-ით)
const uploadCount = files.length || 1;

for (let index = 0; index < files.length; index++) {


  const item = files[index];

  const uploadData = await uploadFileWithProgress(item.file, (percent) => {
const portion = 100 / uploadCount;
    const total = index * portion + (percent * portion) / 100;
    setUploadProgress(Math.round(total));
  });

  const url = uploadData.secure_url;

  if (uploadData.resource_type === 'video') {
    if (!videoUrl) videoUrl = url;
mediaPayload.push({
  url,
  kind: 'VIDEO',
  order: index,
  sourceType: item.sourceType,
  sourceUrl: item.sourceType === 'EXTERNAL'
    ? item.sourceUrl.trim()
    : null,
});


  } else {
    if (!imageUrl) imageUrl = url;
mediaPayload.push({
  url,
  kind: 'IMAGE',
  order: index,
  sourceType: item.sourceType,
  sourceUrl: item.sourceType === 'EXTERNAL' ? item.sourceUrl.trim() : null,
});


  }
}

      // just in case ბოლოში 100% დავაფიქსიროთ
      setUploadProgress(100);

      const baseBody = {
        title: title.trim() || 'Untitled Action',
        description,
        startDate,
        endDate: isOngoing ? null : (endDate || null),
        isOngoing,

        country: country?.value || null,

        topics: topics.map(t => t.value),
        subtopics: subtopics.map(s => s.value),
        tools: tools.map(t => t.value),
        subTools: subTools.map(s => s.value),
      };
if (isEditMode) {
  const body = {
    ...baseBody,
    keepMediaIds: Array.from(keepMediaIds),
    newMedia: mediaPayload,
  };


  await apiRequest(
    `/admin/campaigns/${editCampaignId}`,
    withAuth(tokens.accessToken, {
      method: 'PUT',
      body,
    })
  );

  navigate('/campaigns'); // <- აქ ჩაწერე შენი რეალური route
  return;
} else {
  await apiRequest(
    '/campaigns',
    withAuth(tokens.accessToken, {
      method: 'POST',
      body: {
        ...baseBody,
        imageUrl,
        videoUrl,
        media: mediaPayload,
      },
    })
  );
}


const isAdmin = user?.role === 'ADMIN';

setStatus({
  type: 'success',
  message: isEditMode
    ? 'Campaign updated successfully.'
    : isAdmin
      ? 'Campaign published successfully.'
      : 'Thank you! Your action was sent for review and will appear once approved.',
});

      setShowSuccessOverlay(true); // 👈 overlay ჩართვა

      // გასუფთავება (მხოლოდ CREATE რეჟიმში)
      if (!isEditMode) {
        setFiles([]);
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setIsOngoing(false);
        setCountry(null);
        setTopics([]);
        setSubtopics([]);
        setTools([]);
        setSubTools([]);
        setUploadProgress(0);
      } else {
        // edit mode: new uploads previews გავასუფთავოთ
        files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
        setFiles([]);
        setUploadProgress(0);
      }

    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Upload failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page upload-page">
      <section className="page-header">
<h1>{isEditMode ? 'Edit Campaign' : 'Share Your Action'}</h1>
        <p>Show the world how you&apos;re making a difference!</p>
      </section>

      <form className="upload-form" onSubmit={handleSubmit}>
        {status?.type === 'error' && (
  <div className="edit-warning">
    {status.message}
  </div>
)}

        <div className="upload-dropzone">
          <p>Drag &amp; Drop your file here or click to browse</p>
          <p className="upload-sub">Accepted file types: JPG, PNG, MP4</p>

          <input
            id="fileInput"
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="btn-orange"
            onClick={() => document.getElementById('fileInput').click()}
          >
            Upload Image/Video
          </button>

          {/* პატარა პრიუიუები */}
          {files.length > 0 && (
            <div className="upload-previews">
              {files.map((item, index) => (
                <div key={index} className="upload-preview">
                  {item.file.type.startsWith('image/') ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="upload-preview-media"
                    />
                  ) : (
                    <video
                      src={item.preview}
                      className="upload-preview-media"
                      muted
                      loop
                    />
                  )}

                  <button
                    type="button"
                    className="upload-preview-remove"
                    onClick={() => handleRemoveFile(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && (
  <div className="media-reference-block">
    <h3>Media References</h3>

    {files.map((item, index) => (
      <div key={index} className="media-reference-item">
        <h4>Media {index + 1}</h4>

<div className="form-row">
  <label className="field">
    <span>Source</span>
    <select
      value={item.sourceType}
      onChange={(e) => {
        const value = e.target.value;
        setFiles((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], sourceType: value, sourceUrl: value === 'OWN' ? '' : copy[index].sourceUrl };
          return copy;
        });
      }}
    >
      <option value="OWN">Own (I created it)</option>
      <option value="EXTERNAL">External</option>
    </select>
  </label>

  <label className="field">
    <span>Source link</span>
    <input
      type="url"
      placeholder="https://..."
      value={item.sourceUrl}
      disabled={item.sourceType !== 'EXTERNAL'}
      onChange={(e) => {
        const value = e.target.value;
        setFiles((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], sourceUrl: value };
          return copy;
        });
      }}
    />
  </label>
</div>

      </div>
    ))}
  </div>
)}

          {/* EXISTING MEDIA (EDIT MODE) */}
{isEditMode && (
  <div className="existing-media-block">
    <div className="existing-media-title">
      <span>Existing media</span>
      <span className="edit-pill">EDIT</span>
      {loadingEditCampaign && <span style={{ fontWeight: 600, opacity: 0.7 }}>Loading...</span>}
    </div>

    <div className="existing-media-grid">
      {(existingMedia || [])
        .filter((m) => keepMediaIds.has(m.id))
        .map((m) => (
          <div key={m.id} className="existing-media-item">
            {m.kind === 'VIDEO' ? (
              <video src={m.url} muted loop />
            ) : (
              <img src={m.url} alt="Existing media" />
            )}

            <button
              type="button"
              className="existing-media-remove"
              onClick={() => handleRemoveExistingMedia(m.id)}
              aria-label="Remove existing media"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
    </div>

    {keepMediaIds.size === 0 && (
      <div className="edit-warning">
        You removed all existing media. Please upload at least one new image/video before saving.
      </div>
    )}
  </div>
)}

        </div>

        {/* 👉 ახალი ველი – Title */}
        <label className="field">
          <span>Title</span>
          <input
            type="text"
            placeholder="Give your action a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            placeholder="Tell us about your action..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {/* ✅ Media Source (optional) */}


<div className="form-row">
  <label className="field">
    <span>Start date</span>
    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
    />
  </label>

  <label className="field">
    <span>End date</span>
    <input
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      disabled={isOngoing}
    />
  </label>
</div>

<label className="field" style={{ marginTop: 8 }}>
  <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
    <input
      type="checkbox"
      checked={isOngoing}
      onChange={(e) => {
        const checked = e.target.checked;
        setIsOngoing(checked);
        if (checked) setEndDate('');
      }}
    />
    Ongoing
  </span>
</label>



        <div className="form-row">
          <label className="field">
            <span>Country</span>
            <Select
              options={countryOptions}
              value={country}
              onChange={setCountry}
              placeholder="Select country"
              classNamePrefix="react-select"
              formatOptionLabel={(option) => (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span className={`fi fi-${option.value.toLowerCase()}`} />
                  <span>{option.label}</span>
                </div>
              )}
            />
          </label>

<label className="field">
  <span>Topics</span>
  <Select
    isMulti
    options={topicOptions}
    value={topics}
    onChange={(vals) => {
      const next = vals || [];
      setTopics(next);

      // topic-ების შეცვლისას subtopics გავასუფთავოთ/გავფილტროთ
      const allowed = new Set(
        next.flatMap(sel => {
          const tObj = availableTopics.find(t => t.name === sel.value);
          return (tObj?.subtopics || []).map(st => st.name);
        })
      );
      setSubtopics(prev => prev.filter(st => allowed.has(st.value)));
    }}
    placeholder="Select topics..."
    classNamePrefix="react-select"
  />
</label>

        </div>

        <div className="form-row">
<label className="field">
  <span>Sub-topics (Optional)</span>
  <Select
    isMulti
    options={subtopicOptions}
    value={subtopics}
    onChange={(vals) => setSubtopics(vals || [])}
    isDisabled={!topics.length}
    placeholder={topics.length ? "Select sub-topics..." : "Select topics first"}
    classNamePrefix="react-select"
  />
</label>


<label className="field">
  <span>Tools</span>
  <Select
    isMulti
    options={toolOptions}
    value={tools}
    onChange={(vals) => {
      const next = vals || [];
      setTools(next);

      const allowed = new Set(
        next.flatMap(sel => {
          const tObj = availableTools.find(t => t.name === sel.value);
          return (tObj?.subTools || []).map(st => st.name);
        })
      );
      setSubTools(prev => prev.filter(st => allowed.has(st.value)));
    }}
    placeholder="Select tools..."
    classNamePrefix="react-select"
  />
</label>

        </div>

        {/* მეორე row – Sub-tools */}
        <div className="form-row">
<label className="field">
  <span>Sub-tools (Optional)</span>
  <Select
    isMulti
    options={subToolOptions}
    value={subTools}
    onChange={(vals) => setSubTools(vals || [])}
    isDisabled={!tools.length}
    placeholder={tools.length ? "Select sub-tools..." : "Select tools first"}
    classNamePrefix="react-select"
  />
</label>

        </div>
{submitting && (
  <div className="upload-progress-overlay">
    <div className="upload-progress-box">
      <p className="upload-progress-title">Uploading your files...</p>

      <div className="upload-progress-bar">
        <div
          className="upload-progress-fill"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>

      <p className="upload-progress-text">{uploadProgress}%</p>
    </div>
  </div>
)}
{status?.type === 'success' && showSuccessOverlay && !submitting && (
  <div className="upload-progress-overlay">
    <div className="upload-progress-box">
      <p className="upload-progress-title">
        {status.message}
      </p>

      <button
        type="button"
        className="btn-primary"
        onClick={() => setShowSuccessOverlay(false)}
      >
        Close
      </button>
    </div>
  </div>
)}



        <button type="submit" className="btn-primary" disabled={submitting}>
{submitting ? 'Submitting...' : (isEditMode ? 'Update' : 'Submit')}
        </button>
      </form>
    </div>
  );
}

export default UploadPage;
