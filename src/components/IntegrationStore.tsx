import React from 'react';
import styles from './IntegrationStore.module.css';
import { EndapIntegration, EndapIntegrationCategory } from '../types/endap';

interface IntegrationStoreProps {
  integrations: EndapIntegration[];
  onToggle: (id: string) => void;
  onConfigure: (id: string) => void;
}

const CATEGORY_LABELS: Record<EndapIntegrationCategory, string> = {
  protocol: 'Protocolos',
  connectivity: 'Conectividade',
  platform: 'Plataformas',
  cloud: 'Nuvem',
  device: 'Dispositivos'
};

export const IntegrationStore: React.FC<IntegrationStoreProps> = ({ integrations, onToggle, onConfigure }) => {
  const categories: EndapIntegrationCategory[] = ['protocol', 'connectivity', 'platform', 'cloud', 'device'];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>Loja de Integrações</h2>
        <p className={styles.subtitle}>Ative novos recursos e protocolos para o seu ecossistema ENDAP.</p>
      </header>

      {categories.map(category => {
        const categoryIntegrations = integrations.filter(i => i.category === category);
        if (categoryIntegrations.length === 0) return null;

        return (
          <section key={category} className={styles.categorySection}>
            <h3 className={styles.categoryTitle}>{CATEGORY_LABELS[category]}</h3>
            <div className={styles.grid}>
              {categoryIntegrations.map(integration => (
                <article 
                  key={integration.id} 
                  className={`${styles.card} ${integration.enabled ? styles.active : ''}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.iconWrapper}>{integration.icon}</div>
                    <div className={styles.toggleWrapper}>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={integration.enabled} 
                          onChange={() => onToggle(integration.id)} 
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className={styles.cardBody}>
                    <h4 className={styles.cardName}>{integration.name}</h4>
                    <p className={styles.cardDescription}>{integration.description}</p>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles[integration.status]}`}>
                      {integration.status.toUpperCase()}
                    </span>
                    <button 
                      className={styles.configButton}
                      onClick={() => onConfigure(integration.id)}
                      disabled={!integration.enabled}
                    >
                      Configurar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
