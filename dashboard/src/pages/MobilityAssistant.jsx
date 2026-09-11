import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { api } from '../services/api';
import { assistantData } from '../assistant/data';
import { answerQuestion } from '../assistant/engine';
import './MobilityAssistant.css';

const suggestions = [
  'Peak demand tomorrow morning',
  'Busiest zones at night',
  'Strongest evening OD flows',
  'Top pickup zones',
  'Fare model performance',
  'ETA model performance',
  'Data quality summary'
];

export function MobilityAssistant() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const request = useRef(null);
  const end = useRef(null);

  useEffect(() => {
    document.body.classList.add('assistant-no-scroll');
    return () => {
      document.body.classList.remove('assistant-no-scroll');
      request.current?.abort();
    };
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, pending]);

  async function ask(value) {
    if (!value.trim() || request.current) return;
    setQuestion('');
    setPending(true);
    setMessages(m => [...m, { question: value.trim() }]);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    const services = Object.fromEntries(
      ['farePrediction', 'durationPrediction', 'demandForecast'].map(name => [
        name,
        val => api[name](val, { signal: controller.signal })
      ])
    );
    try {
      const answer = await answerQuestion(value, assistantData, services);
      if (request.current === controller) {
        setMessages(m => [...m, { answer }]);
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <PageContainer className="assistant-page">
      <div className="assistant-header">
        <div className="assistant-header-left">
          <div className="assistant-eyebrow">URBANFLOW INTELLIGENCE</div>
          <h1 className="assistant-title">AI Mobility Assistant</h1>
        </div>
        <div className="assistant-header-badges">
          <span className="assistant-badge-pill">
            <span className="assistant-badge-dot" /> Grounded Analytics · Zero LLM API
          </span>
        </div>
      </div>

      <section className="assistant-workspace" data-tour="assistant-workspace" aria-label="Mobility analytics assistant">
        <div className="assistant-toolbar">
          <div className="assistant-status-indicator">
            <span className="assistant-live-dot" />
            <strong>Analytics Conversation</strong>
            <span className="assistant-session-count">
              {messages.length ? `${messages.length} messages` : 'Ready'}
            </span>
          </div>
          <button
            className="secondary-button assistant-clear-btn"
            disabled={pending || !messages.length}
            onClick={() => setMessages([])}
          >
            Clear conversation
          </button>
        </div>

        <div
          className="assistant-transcript"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={pending}
        >
          {!messages.length && (
            <div className="assistant-welcome">
              <span className="assistant-welcome-icon" aria-hidden="true">↗</span>
              <h2>Where should we focus?</h2>
              <p>
                Explore demand forecasts, historical hotspots, OD corridor movements, zone clusters,
                fare predictions, ETA duration estimates, and model performance.
              </p>
            </div>
          )}

          {messages.map((m, i) =>
            m.question ? (
              <div key={i} className="assistant-question">
                <span>You</span>
                <p>{m.question}</p>
              </div>
            ) : (
              <article key={i} className={`assistant-answer assistant-${m.answer.status}`}>
                <div className="assistant-answer-header">
                  <span className="assistant-label">
                    UrbanFlow · {m.answer.status === 'ok' ? 'Evidence available' : m.answer.status}
                  </span>
                  <span className="assistant-badge-tag">
                    {m.answer.status === 'ok'
                      ? (m.answer.heading.includes('Model forecast') ? 'ML Prediction' :
                         m.answer.heading.includes('Historical') ? 'Historical Benchmark' :
                         'Verified Output')
                      : m.answer.status === 'clarification' ? 'Clarification' :
                        m.answer.status === 'empty' ? 'No Records' :
                        m.answer.status === 'unsupported' ? 'Guidance' : 'Notice'}
                  </span>
                </div>

                <h2 className="assistant-card-heading">{m.answer.heading}</h2>

                {m.answer.items.length > 0 && (
                  <ul className="assistant-items-grid">
                    {m.answer.items.map((item, j) => {
                      const colonIdx = item.indexOf(':');
                      if (colonIdx > 0) {
                        const name = item.slice(0, colonIdx).trim();
                        const val = item.slice(colonIdx + 1).trim();
                        return (
                          <li key={j} className="assistant-item-card">
                            <span className="item-rank-badge">#{j + 1}</span>
                            <div className="item-content-wrap">
                              <span className="item-name">{name}</span>
                              <span style={{ display: 'none' }}>: </span>
                              <span className="item-badge">{val}</span>
                            </div>
                          </li>
                        );
                      }
                      return (
                        <li key={j} className="assistant-item-card single-metric">
                          <span className="item-hero-val">{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {m.answer.insight && (
                  <div className="assistant-insight-card">
                    <span className="insight-bulb" aria-hidden="true">💡</span>
                    <div className="insight-text-wrapper">
                      <strong>Takeaway:</strong>
                      <p>{m.answer.insight}</p>
                    </div>
                  </div>
                )}

                <footer className="assistant-card-footer">
                  <span className="source-title">Source / method:</span>
                  <span className="source-info">{m.answer.source}</span>
                </footer>

                {m.answer.status === 'error' && (
                  <button
                    className="secondary-button retry-btn"
                    disabled={pending}
                    onClick={() => ask(messages[i - 1].question)}
                  >
                    Retry question
                  </button>
                )}
              </article>
            )
          )}

          {pending && (
            <p className="assistant-loading" role="status">
              Checking UrbanFlow sources…
            </p>
          )}
          <div ref={end} />
        </div>

        <div className="assistant-compose">
          <div className="assistant-chips-bar">
            <span className="chips-hint">Suggested:</span>
            <div className="assistant-chips" aria-label="Suggested questions">
              {suggestions.map(q => (
                <button
                  disabled={pending}
                  key={q}
                  onClick={() => ask(q)}
                  type="button"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              ask(question);
            }}
            className="assistant-form"
          >
            <label htmlFor="mobility-question" className="sr-only">
              Your analytics question
            </label>
            <div className="assistant-input-row">
              <input
                id="mobility-question"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                maxLength={600}
                placeholder="Where should drivers position in the morning?"
                disabled={pending}
                autoComplete="off"
                aria-label="Your analytics question"
              />
              <button
                className="primary-button assistant-submit-btn"
                disabled={pending || !question.trim()}
                type="submit"
              >
                {pending ? 'Checking…' : 'Ask UrbanFlow'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </PageContainer>
  );
}

