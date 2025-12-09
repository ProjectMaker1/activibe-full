// frontend/src/routes/UploadPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import { validateRequired } from '@shared/validators.js';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';
import '../styles/upload.css';
function UploadPage() {
  const { tokens, user } = useAuth();

  // 👉 ახალი: სათაური
  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [country, setCountry] = useState(null); // { label, value }
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');

  // TOOLS
  const [tools, setTools] = useState(''); // არჩეული მთავარი tool-ის სახელი
  const [subTool, setSubTool] = useState(''); // არჩეული sub-tool-ის სახელი
  const [availableSubTools, setAvailableSubTools] = useState([]); // არჩეული tool-ის sub-tools

  // dropdown data
  const [availableTopics, setAvailableTopics] = useState([]);
  const [availableSubtopics, setAvailableSubtopics] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);

  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // progress bar
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const countryOptions = useMemo(() => countryList().getData(), []);

  // ბევრი ფაილი: [{ file: File, preview: string }]
  const [files, setFiles] = useState([]);



  // load topics + tools for dropdowns
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiRequest('/categories');
        setAvailableTopics(res.topics || []);
        setAvailableTools(res.tools || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };

    loadCategories();
  }, []);
const openCalendar = (e) => {
  e.stopPropagation();
  const el = document.getElementById('upload-date-input');
  if (!el) return;

  // თუ ბრაუზერი მხარს უჭერს showPicker-ს
  if (typeof el.showPicker === 'function') {
    el.showPicker();
  } else {
    el.focus(); // fallback
  }
};


  const handleTopicChange = (e) => {
    const topicId = Number(e.target.value);
    const topicObj = availableTopics.find((t) => t.id === topicId) || null;

    setTopic(topicObj ? topicObj.name : '');
    setSubtopic('');
    setAvailableSubtopics(topicObj ? topicObj.subtopics || [] : []);
  };

  const handleSubtopicChange = (e) => {
    setSubtopic(e.target.value);
  };

  const handleToolChange = (e) => {
    const toolId = Number(e.target.value);
    const toolObj = availableTools.find((t) => t.id === toolId) || null;

    setTools(toolObj ? toolObj.name : '');
    setSubTool(''); // როცა მთავარი tool იცვლება, sub-tool გავასუფთავოთ
    setAvailableSubTools(toolObj ? toolObj.subTools || [] : []);
  };

  const handleSubToolChange = (e) => {
    setSubTool(e.target.value);
  };

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
      });
    }

    if (next.length) {
      setFiles((prev) => [...prev, ...next]);
      setStatus(null);
    }

    // იგივე ფაილები რომ ისევ შემოიტანოს, input-value გავასუფთავოთ
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

    if (!files.length) {
      setStatus({
        type: 'error',
        message: 'Please upload at least one image or video.',
      });
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
for (let index = 0; index < files.length; index++) {
  const item = files[index];

  const uploadData = await uploadFileWithProgress(item.file, (percent) => {
    const portion = 100 / files.length;
    const total = index * portion + (percent * portion) / 100;
    setUploadProgress(Math.round(total));
  });

  const url = uploadData.secure_url;

  if (uploadData.resource_type === 'video') {
    if (!videoUrl) videoUrl = url;
    mediaPayload.push({ url, kind: 'VIDEO', order: index });
  } else {
    if (!imageUrl) imageUrl = url;
    mediaPayload.push({ url, kind: 'IMAGE', order: index });
  }
}

      // just in case ბოლოში 100% დავაფიქსიროთ
      setUploadProgress(100);

      await apiRequest(
        '/campaigns',
        withAuth(tokens.accessToken, {
          method: 'POST',
          body: {
            title: title.trim() || 'Untitled Action',
            description,
            date: date || new Date().toISOString(),
            country: country?.value || null,
            topic,
            subtopic,
            tools, // ✅ მთავარ tool-ს ვინახავთ
            subTool, // ✅ sub-tool ცალკე გადაიცემა
            imageUrl,
            videoUrl,
            media: mediaPayload,
          },
        })
      );

      const isAdmin = user?.role === 'ADMIN';

      setStatus({
        type: 'success',
        message: isAdmin
          ? 'Campaign published successfully.'
          : 'Thank you! Your action was sent for review and will appear once approved.',
      });
      setShowSuccessOverlay(true); // 👈 overlay ჩართვა

      // გასუფთავება
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      setFiles([]);
      setTitle('');
      setDescription('');
      setDate('');
      setCountry(null);
      setTopic('');
      setSubtopic('');
      setTools('');
      setSubTool('');
      setAvailableSubTools([]);
      setAvailableSubtopics([]);
      setUploadProgress(0);
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
        <h1>Share Your Action</h1>
        <p>Show the world how you&apos;re making a difference!</p>
      </section>

      <form className="upload-form" onSubmit={handleSubmit}>
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


<label className="field">
  <span>Date</span>

<div
  className={`date-click-wrapper ${date ? 'has-value' : ''}`}
  onClick={openCalendar}
>
  {!date && (
    <span className="date-placeholder">dd/mm/yyyy</span>
  )}

  <input
    id="upload-date-input"
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="date-input"
  />

  <span className="calendar-icon">📅</span>
</div>

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
            <span>Topic</span>
            <select
              value={availableTopics.find((t) => t.name === topic)?.id || ''}
              onChange={handleTopicChange}
            >
              <option value="">Select a topic</option>
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Sub-topic</span>
            <select
              value={subtopic}
              onChange={handleSubtopicChange}
              disabled={!availableSubtopics.length}
            >
              <option value="">
                {availableSubtopics.length
                  ? 'Select a sub-topic'
                  : 'Select a topic first'}
              </option>
              {availableSubtopics.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tools</span>
            <select
              value={availableTools.find((t) => t.name === tools)?.id || ''}
              onChange={handleToolChange}
            >
              <option value="">Select a tool</option>
              {availableTools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* მეორე row – Sub-tools */}
        <div className="form-row">
          <label className="field">
            <span>Sub-tools</span>
            <select
              value={subTool}
              onChange={handleSubToolChange}
              disabled={!availableSubTools.length}
            >
              <option value="">
                {availableSubTools.length
                  ? 'Select a sub-tool'
                  : 'Select a tool first'}
              </option>
              {availableSubTools.map((st) => (
                <option key={st.id} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
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
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

export default UploadPage;
