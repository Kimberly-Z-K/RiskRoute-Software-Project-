import React, { useEffect, useState } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';

import { supabase } from '../../../lib/supabase';

const AdminAuditLog = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const [selectedLog, setSelectedLog] = useState(null);

  // =========================================================
  // ADMIN CHECK
  // =========================================================

  const userRole = String(user?.role || '').toLowerCase();

  const isAdmin =
    userRole === 'admin' ||
    userRole === 'administrator' ||
    userRole.startsWith('admin');

  // =========================================================
  // PLATFORM
  // =========================================================

  const getPlatform = (log) => {
    if (log?._platform) {
      return String(log._platform).toLowerCase();
    }

    if (log?.details?.platform) {
      return String(log.details.platform).toLowerCase();
    }

    if (log?._source === 'mobile_audit_logs') {
      return 'mobile';
    }

    return 'web';
  };

  // =========================================================
  // FETCH LOGS
  // =========================================================

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('====================================');
      console.log('FETCHING AUDIT LOGS');
      console.log('====================================');

      // -------------------------------------------------------
      // GET CURRENT AUTH USER
      // -------------------------------------------------------

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('AUTH USER ERROR:', authError);
      }

      console.log('AUTH USER:', authUser);
      console.log(
        'AUTH USER ID:',
        authUser?.id
      );
      console.log(
        'AUTH USER EMAIL:',
        authUser?.email
      );
      console.log(
        'AUTH USER METADATA:',
        authUser?.user_metadata
      );
      console.log(
        'AUTH USER ROLE:',
        authUser?.user_metadata?.role
      );

      if (!authUser) {
        throw new Error(
          'No authenticated Supabase user found.'
        );
      }

      // -------------------------------------------------------
      // WEB AUDIT LOGS
      // -------------------------------------------------------

      const {
        data: webLogs,
        error: webError,
      } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(200);

      if (webError) {
        console.error(
          'WEB AUDIT FETCH ERROR:',
          webError
        );
      }

      // -------------------------------------------------------
      // MOBILE AUDIT LOGS
      // -------------------------------------------------------

      const {
        data: mobileLogs,
        error: mobileError,
      } = await supabase
        .from('mobile_audit_logs')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(200);

      console.log(
        'MOBILE QUERY DATA:',
        mobileLogs
      );

      console.log(
        'MOBILE QUERY ERROR:',
        mobileError
      );

      if (mobileError) {
        console.error(
          '❌ MOBILE AUDIT FETCH ERROR:',
          mobileError
        );
      }

      console.log(
        'WEB AUDIT LOGS:',
        webLogs?.length || 0
      );

      console.log(
        'MOBILE AUDIT LOGS:',
        mobileLogs?.length || 0
      );

      // -------------------------------------------------------
      // IF MOBILE QUERY IS BLOCKED
      // -------------------------------------------------------

      if (mobileError) {
        setError(
          `Mobile audit logs could not be loaded: ${mobileError.message}`
        );
      }

      // -------------------------------------------------------
      // NORMALIZE WEB
      // -------------------------------------------------------

      const normalizedWebLogs = (
        webLogs || []
      ).map((log) => ({
        ...log,
        _platform: 'web',
        _source: 'audit_logs',
      }));

      // -------------------------------------------------------
      // NORMALIZE MOBILE
      // -------------------------------------------------------

      const normalizedMobileLogs = (
        mobileLogs || []
      ).map((log) => ({
        ...log,
        _platform: 'mobile',
        _source: 'mobile_audit_logs',
      }));

      // -------------------------------------------------------
      // COMBINE
      // -------------------------------------------------------

      const combinedLogs = [
        ...normalizedWebLogs,
        ...normalizedMobileLogs,
      ];

      // -------------------------------------------------------
      // SORT
      // -------------------------------------------------------

      combinedLogs.sort((a, b) => {
        const dateA = new Date(
          a.created_at ||
            a.details?.timestamp ||
            0
        );

        const dateB = new Date(
          b.created_at ||
            b.details?.timestamp ||
            0
        );

        return dateB - dateA;
      });

      // -------------------------------------------------------
      // SAVE
      // -------------------------------------------------------

      setLogs(
        combinedLogs.slice(0, 200)
      );

      console.log(
        'TOTAL AUDIT LOGS:',
        combinedLogs.length
      );

      console.log(
        '===================================='
      );
    } catch (err) {
      console.error(
        'FAILED TO LOAD AUDIT LOGS:',
        err
      );

      setError(
        err?.message ||
          'Unable to load the system audit log.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD + REALTIME
  // =========================================================

  useEffect(() => {
    console.log(
      'ADMIN AUDIT USER:',
      user
    );

    console.log(
      'ADMIN ROLE:',
      userRole
    );

    console.log(
      'IS ADMIN:',
      isAdmin
    );

    if (!isAdmin) {
      console.log(
        'AUDIT LOG BLOCKED - NOT ADMIN'
      );

      setLoading(false);

      return;
    }

    fetchAuditLogs();

    // -------------------------------------------------------
    // REALTIME
    // -------------------------------------------------------

    const channel = supabase
      .channel('admin-audit-log')

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          console.log(
            'NEW WEB AUDIT EVENT:',
            payload.new
          );

          const newLog = {
            ...payload.new,
            _platform: 'web',
            _source: 'audit_logs',
          };

          setLogs((previousLogs) => {
            const exists =
              previousLogs.some(
                (log) =>
                  log.id === payload.new.id &&
                  log._source ===
                    'audit_logs'
              );

            if (exists) {
              return previousLogs;
            }

            return [
              newLog,
              ...previousLogs,
            ].slice(0, 200);
          });
        }
      )

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mobile_audit_logs',
        },
        (payload) => {
          console.log(
            'NEW MOBILE AUDIT EVENT:',
            payload.new
          );

          const newLog = {
            ...payload.new,
            _platform: 'mobile',
            _source:
              'mobile_audit_logs',
          };

          setLogs((previousLogs) => {
            const exists =
              previousLogs.some(
                (log) =>
                  log.id === payload.new.id &&
                  log._source ===
                    'mobile_audit_logs'
              );

            if (exists) {
              return previousLogs;
            }

            return [
              newLog,
              ...previousLogs,
            ].slice(0, 200);
          });
        }
      )

      .subscribe((status) => {
        console.log(
          'AUDIT REALTIME STATUS:',
          status
        );
      });

    return () => {
      console.log(
        'Removing audit realtime channel'
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [isAdmin]);

  // =========================================================
  // NON ADMIN
  // =========================================================

  if (!isAdmin) {
    return null;
  }

  // =========================================================
  // ACTIONS
  // =========================================================

  const actions = [
    ...new Set(
      logs
        .map((log) => log.action)
        .filter(Boolean)
    ),
  ].sort();

  // =========================================================
  // FILTER
  // =========================================================

  const filteredLogs = logs.filter(
    (log) => {
      const platform =
        getPlatform(log);

      if (
        platformFilter !== 'all' &&
        platform !== platformFilter
      ) {
        return false;
      }

      if (
        actionFilter !== 'all' &&
        log.action !== actionFilter
      ) {
        return false;
      }

      const search =
        searchTerm
          .toLowerCase()
          .trim();

      if (!search) {
        return true;
      }

      const searchableText = [
        log.user_name,
        log.user_email,
        log.user_role,
        log.action,
        log.description,
        log.page,
        log.element,
        log.target_name,
        log.target_id,
        platform,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(
        search
      );
    }
  );

  // =========================================================
  // COUNTS
  // =========================================================

  const mobileCount =
    logs.filter(
      (log) =>
        getPlatform(log) ===
        'mobile'
    ).length;

  const webCount =
    logs.filter(
      (log) =>
        getPlatform(log) ===
        'web'
    ).length;

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return '—';
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return '—';
    }

    return parsedDate.toLocaleString();
  };

  // =========================================================
  // DISPLAY VALUE
  // =========================================================

  const displayValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    if (
      typeof value === 'object'
    ) {
      return JSON.stringify(
        value,
        null,
        2
      );
    }

    return String(value);
  };

  // =========================================================
  // PLATFORM BADGE
  // =========================================================

  const PlatformBadge = ({
    platform,
  }) => {
    const isMobile =
      platform === 'mobile';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 9px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor:
            isMobile
              ? '#ede9fe'
              : '#dbeafe',
          color: isMobile
            ? '#6d28d9'
            : '#1d4ed8',
        }}
      >
        {isMobile
          ? 'Mobile'
          : 'Web'}
      </span>
    );
  };

  // =========================================================
  // ACTION BADGE
  // =========================================================

  const ActionBadge = ({
    action,
  }) => (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor:
          '#f3f4f6',
        color: '#374151',
      }}
    >
      {action || '—'}
    </span>
  );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      style={{
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Shield size={28} />

            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              System Audit Log
            </h1>
          </div>

          <p
            style={{
              margin:
                '6px 0 0 38px',
              color: '#6b7280',
              fontSize: '14px',
            }}
          >
            Monitor activity from
            the web dashboard and
            mobile app.
          </p>
        </div>

        <button
          onClick={
            fetchAuditLogs
          }
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            border:
              '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor:
              '#ffffff',
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            padding: '14px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor:
              '#fee2e2',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[
          ['All Activity', logs.length],
          ['Mobile Activity', mobileCount],
          ['Web Activity', webCount],
        ].map(([label, count]) => (
          <div
            key={label}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border:
                '1px solid #e5e7eb',
              backgroundColor:
                '#ffffff',
            }}
          >
            <div
              style={{
                color: '#6b7280',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
              }}
            >
              {count}
            </div>
          </div>
        ))}
      </div>

      {/* FILTERS */}

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 280px',
          }}
        >
          <Search
            size={18}
            style={{
              position:
                'absolute',
              left: '12px',
              top: '50%',
              transform:
                'translateY(-50%)',
              color: '#9ca3af',
            }}
          />

          <input
            type="text"
            placeholder="Search audit logs..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            style={{
              width: '100%',
              boxSizing:
                'border-box',
              padding:
                '10px 12px 10px 40px',
              border:
                '1px solid #d1d5db',
              borderRadius: '8px',
            }}
          />
        </div>

        <select
          value={
            platformFilter
          }
          onChange={(event) =>
            setPlatformFilter(
              event.target.value
            )
          }
          style={{
            padding:
              '10px 12px',
            border:
              '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor:
              '#ffffff',
          }}
        >
          <option value="all">
            All Platforms
          </option>
          <option value="mobile">
            Mobile
          </option>
          <option value="web">
            Web
          </option>
        </select>

        <select
          value={actionFilter}
          onChange={(event) =>
            setActionFilter(
              event.target.value
            )
          }
          style={{
            padding:
              '10px 12px',
            border:
              '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor:
              '#ffffff',
          }}
        >
          <option value="all">
            All Actions
          </option>

          {actions.map(
            (action) => (
              <option
                key={action}
                value={action}
              >
                {action}
              </option>
            )
          )}
        </select>
      </div>

      {/* COUNT */}

      <div
        style={{
          marginBottom: '12px',
          color: '#6b7280',
          fontSize: '14px',
        }}
      >
        Showing{' '}
        <strong>
          {filteredLogs.length}
        </strong>{' '}
        audit events
      </div>

      {/* TABLE */}

      <div
        style={{
          backgroundColor:
            '#ffffff',
          border:
            '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'auto',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '50px',
              textAlign:
                'center',
              color: '#6b7280',
            }}
          >
            Loading audit logs...
          </div>
        ) : filteredLogs.length ===
          0 ? (
          <div
            style={{
              padding: '50px',
              textAlign:
                'center',
              color: '#6b7280',
            }}
          >
            No audit logs found.
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse:
                'collapse',
              minWidth:
                '900px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor:
                    '#f9fafb',
                }}
              >
                {[
                  'Date',
                  'User',
                  'Action',
                  'Page',
                  'Platform',
                  'Details',
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: '14px',
                      textAlign:
                        heading ===
                        'Details'
                          ? 'center'
                          : 'left',
                      fontSize:
                        '12px',
                      color:
                        '#6b7280',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map(
                (log, index) => {
                  const platform =
                    getPlatform(
                      log
                    );

                  return (
                    <tr
                      key={`${log._source}-${log.id || index}`}
                      style={{
                        borderTop:
                          '1px solid #e5e7eb',
                      }}
                    >
                      <td
                        style={{
                          padding: '14px',
                          fontSize:
                            '13px',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          log.created_at ||
                            log.details
                              ?.timestamp
                        )}
                      </td>

                      <td
                        style={{
                          padding: '14px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              600,
                            fontSize:
                              '14px',
                          }}
                        >
                          {log.user_name ||
                            'Unknown User'}
                        </div>

                        <div
                          style={{
                            color:
                              '#6b7280',
                            fontSize:
                              '12px',
                            marginTop:
                              '3px',
                          }}
                        >
                          {log.user_email ||
                            'No email'}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: '14px',
                        }}
                      >
                        <ActionBadge
                          action={
                            log.action
                          }
                        />
                      </td>

                      <td
                        style={{
                          padding: '14px',
                          fontSize:
                            '13px',
                        }}
                      >
                        {log.page ||
                          '—'}
                      </td>

                      <td
                        style={{
                          padding: '14px',
                        }}
                      >
                        <PlatformBadge
                          platform={
                            platform
                          }
                        />
                      </td>

                      <td
                        style={{
                          padding: '14px',
                          textAlign:
                            'center',
                        }}
                      >
                        <button
                          onClick={() =>
                            setSelectedLog(
                              log
                            )
                          }
                          style={{
                            display:
                              'inline-flex',
                            alignItems:
                              'center',
                            gap: '6px',
                            padding:
                              '7px 10px',
                            border:
                              '1px solid #d1d5db',
                            borderRadius:
                              '7px',
                            backgroundColor:
                              '#ffffff',
                            cursor:
                              'pointer',
                          }}
                        >
                          <Eye
                            size={15}
                          />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}

      {selectedLog && (
        <div
          onClick={() =>
            setSelectedLog(
              null
            )
          }
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY:
                'auto',
              backgroundColor:
                '#ffffff',
              borderRadius:
                '12px',
              padding: '24px',
              boxSizing:
                'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  '20px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                }}
              >
                Audit Event Details
              </h2>

              <button
                onClick={() =>
                  setSelectedLog(
                    null
                  )
                }
                style={{
                  border: 'none',
                  background:
                    'transparent',
                  cursor:
                    'pointer',
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '140px 1fr',
                gap: '12px',
                fontSize:
                  '14px',
              }}
            >
              <strong>User</strong>
              <span>
                {displayValue(
                  selectedLog.user_name
                )}
              </span>

              <strong>Email</strong>
              <span>
                {displayValue(
                  selectedLog.user_email
                )}
              </span>

              <strong>Role</strong>
              <span>
                {displayValue(
                  selectedLog.user_role
                )}
              </span>

              <strong>Action</strong>
              <span>
                <ActionBadge
                  action={
                    selectedLog.action
                  }
                />
              </span>

              <strong>Page</strong>
              <span>
                {displayValue(
                  selectedLog.page
                )}
              </span>

              <strong>Element</strong>
              <span>
                {displayValue(
                  selectedLog.element
                )}
              </span>

              <strong>Platform</strong>
              <span>
                <PlatformBadge
                  platform={getPlatform(
                    selectedLog
                  )}
                />
              </span>

              <strong>Date</strong>
              <span>
                {formatDate(
                  selectedLog.created_at ||
                    selectedLog.details
                      ?.timestamp
                )}
              </span>

              <strong>Target ID</strong>
              <span>
                {displayValue(
                  selectedLog.target_id
                )}
              </span>

              <strong>Target Name</strong>
              <span>
                {displayValue(
                  selectedLog.target_name
                )}
              </span>

              <strong>Before</strong>
              <span>
                {displayValue(
                  selectedLog.before_value
                )}
              </span>

              <strong>After</strong>
              <span>
                {displayValue(
                  selectedLog.after_value
                )}
              </span>

              <strong>
                Description
              </strong>
              <span>
                {displayValue(
                  selectedLog.description
                )}
              </span>
            </div>

            <div
              style={{
                marginTop: '24px',
              }}
            >
              <h3
                style={{
                  margin:
                    '0 0 10px',
                  fontSize: '16px',
                }}
              >
                Additional Details
              </h3>

              <pre
                style={{
                  margin: 0,
                  padding: '14px',
                  backgroundColor:
                    '#f9fafb',
                  border:
                    '1px solid #e5e7eb',
                  borderRadius:
                    '8px',
                  overflowX:
                    'auto',
                  fontSize:
                    '12px',
                }}
              >
                {JSON.stringify(
                  selectedLog.details ||
                    {},
                  null,
                  2
                )}
              </pre>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                marginTop:
                  '20px',
              }}
            >
              <button
                onClick={() =>
                  setSelectedLog(
                    null
                  )
                }
                style={{
                  padding:
                    '10px 16px',
                  border: 'none',
                  borderRadius:
                    '8px',
                  backgroundColor:
                    '#111827',
                  color:
                    '#ffffff',
                  cursor:
                    'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;