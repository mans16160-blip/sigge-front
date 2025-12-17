{
  /** 
import * as React from 'react';
import styles from './Gallery.module.css';
import { FaFile } from "react-icons/fa";
import { useEffect, useState } from 'react';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import keycloak from './../../keycloak.ts'
import url from './../../url.ts'
export default function Gallery() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdfIds, setLoadingPdfIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [pdfs, setPdfs] = useState([])
  const [rowLimit, setRowLimit] = useState<number>(10); 
  const [searchTerm, setSearchTerm] = useState('');
  const token  = localStorage.getItem('token');
  const admin = localStorage.getItem('admin');
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetch(`${url}/users§/read${admin == '0' ? '-user' : ''}`, {
      method: 'POST',
            headers: {
    Authorization: `Bearer ${keycloak.token}`,
    'Content-Type': 'application/json'
  },
      body: JSON.stringify({
        token: token,
        user: username,
        username: username,
        admin: admin
      })
    })
      .then(response => response.json())
      .then(data => {
        data.reports.reverse()
        setReportData(data.reports);
        setLoading(false); 
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false); 
      });
  }, []);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };const highlightText = (text: string, query: string) => {
    if (!query) return text;
  
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i}>{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };
  const filteredReports = reportData.filter(item => {
    const values = Object.values(item).join(' ').toLowerCase();
    return values.includes(searchTerm.toLowerCase());
  });
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
  
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  };
  const handleRowLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowLimit(parseInt(e.target.value));
  };
  const sortedReports = React.useMemo(() => {
    const sorted = [...filteredReports];
    if (sortConfig !== null) {
      sorted.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
  
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredReports, sortConfig]);
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };
  const openPDFWhenReady = async (id: string) => {

    setLoadingPdfIds(prev => new Set(prev).add(id))
    const newWindow = window.open('', '_blank');
    if (!newWindow) {

      setLoadingPdfIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      return;
    }
  

    newWindow.document.title = 'Loading PDF...';
    newWindow.document.body.innerHTML = '<p style="font-family:sans-serif;">Loading PDF, please wait...</p>';
  
    try {

      const response = await fetch(`${url}/pdf/${id}`, {
        method: 'GET',
                    headers: {
    Authorization: `Bearer ${keycloak.token}`,
    'Content-Type': 'application/json'
  },

      });
  
      const data = await response.json();
  
      if (data.response && Array.isArray(data.response )) {
        const pdfBase64 = data.response[0];
        const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;
  

        newWindow.document.body.innerHTML = '';
        const iframe = newWindow.document.createElement('iframe');
        iframe.src = pdfUrl;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.style.border = 'none';
        newWindow.document.body.style.margin = '0';
        newWindow.document.body.appendChild(iframe);
        newWindow.document.title = id
      } else {
        newWindow.document.body.innerHTML = '<p>Failed to load PDF.</p>';
      }
    } catch (err) {
      console.error('Error:', err);
      newWindow.document.body.innerHTML = '<p>Error loading PDF.</p>';
    }
    setLoadingPdfIds(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  };
  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.wideContainer}>
      <div className="search-container">
  <input
    type="text"
    id="searchInput"
    placeholder="Sök..."
    value={searchTerm}
    onChange={handleSearchChange}
  />
</div>
       
        <div className={styles.tableWrapper}>
        <table className={styles.table}>
        <thead>
  <tr>
    <th onClick={() => handleSort('user')}>Namn {sortConfig?.key === 'user' && ( sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}</th>
    <th onClick={() => handleSort('title')}>Lösenord {sortConfig?.key === 'title' && ( sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}</th>
    <th onClick={() => handleSort('date')}>Datum {sortConfig?.key === 'dater' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}</th>
    <th onClick={() => handleSort('total')}>Summa {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}</th>
    <th>PDF</th>
  </tr>
</thead>
    <tbody className={styles.scrollBody}>
    {sortedReports.slice(0, rowLimit).map((item, index) => (
  <tr key={index}>
    <td>{highlightText(item.user, searchTerm)}</td>
    <td>{highlightText(item.title, searchTerm)}</td>
    <td>{highlightText(formatDate(item.date), searchTerm)}</td>
    <td>{highlightText(item.total.toString(), searchTerm)}</td>
    <td>
      {loadingPdfIds.has(item.report_id) ? (
        <span className={styles.spinner}></span>
      ) : (
        <button onClick={() => openPDFWhenReady(item.report_id)}>
          <FaFile />
        </button>
      )}
    </td>
  </tr>
))}
</tbody>
  </table>
        </div>
        <div className={styles.controls}>
  <label htmlFor="rowLimitSelect">Rows to show:</label>
  <select id="rowLimitSelect" onChange={handleRowLimitChange} value={rowLimit}>
    <option value={5}>5</option>
    <option value={10}>10</option>
    <option value={25}>25</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
  </select>
</div>
        </div>

      </div>
    
  );
}*/
}
