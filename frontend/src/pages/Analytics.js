import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { 
  ChartBarIcon, 
  DocumentIcon, 
  ArrowLeftIcon,
  CubeIcon,
  CircleStackIcon,
  Square3Stack3DIcon,
  TrashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import ThreeJSVisualization from '../components/ThreeJSVisualization';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { id } = useParams();
  const { currentFile, analytics, loading, fetchFileDetails, fetchAnalytics, generateCustomChart, deleteFileWithAnalytics } = useAnalytics();
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState('bar');
  const [customChartData, setCustomChartData] = useState(null);
  const [xAxisLabelOverride, setXAxisLabelOverride] = useState(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedXColumn, setSelectedXColumn] = useState(0);
  const [selectedYColumn, setSelectedYColumn] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchFileDetails(id);
      fetchAnalytics(id);
    }
  }, [id]);

  const handleCustomChartGeneration = async () => {
    if (!id) return;
    
    const result = await generateCustomChart(id, chartType, selectedXColumn, selectedYColumn);
    if (result) {
      // Update chart data with proper labels
      const updatedChartData = {
        ...result.chartData,
        datasets: result.chartData.datasets.map(dataset => ({
          ...dataset,
          label: result.yColumnName || dataset.label
        }))
      };
      setCustomChartData(updatedChartData);
      setXAxisLabelOverride(result.xColumnName || null);
      setShowColumnSelector(false);
    }
  };

  const handleFileDeletion = async () => {
    if (!id) return;
    
    const result = await deleteFileWithAnalytics(id);
    if (result.success) {
      // Redirect to dashboard after successful deletion
      window.location.href = '/dashboard';
    }
    setShowDeleteConfirm(false);
  };

  const getAvailableColumns = () => {
    if (!analytics?.statistics) return [];
    
    const { numericColumns, textColumns } = analytics.statistics;
    const allColumns = { ...numericColumns, ...textColumns };
    return Object.keys(allColumns);
  };

  const getChartOptions = () => {
    const data = getChartData();
    const yAxisLabel = data.datasets?.[0]?.label || 'Values';
    const xAxisLabel = xAxisLabelOverride || 'Categories';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      // Ensure solid background so exported PNG is not transparent
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        title: {
          display: true,
          text: `${chartType.toUpperCase()} Chart: ${yAxisLabel}`,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              return `${xAxisLabel}: ${context[0].label}`;
            },
            label: function(context) {
              return `${yAxisLabel}: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel,
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          ticks: {
            font: {
              size: 12
            }
          }
        },
        x: {
          title: {
            display: true,
            text: xAxisLabel,
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          ticks: {
            font: {
              size: 12
            }
          }
        }
      },
    };
  };

  const getChartData = () => {
    // Use custom chart data if available, otherwise use default analytics data
    const dataSource = customChartData || analytics?.chartData?.[chartType];
    
    if (!dataSource) {
      console.log(`No chart data found for type: ${chartType}`, analytics?.chartData);
      return {
        labels: [],
        datasets: []
      };
    }
    
    console.log(`Chart data for ${chartType}:`, dataSource);
    
    if (!dataSource.labels || !dataSource.datasets || dataSource.datasets.length === 0) {
      console.log(`Invalid chart data structure for ${chartType}:`, dataSource);
      return {
        labels: [],
        datasets: []
      };
    }
    
    return dataSource;
  };

  const renderChart = () => {
    const data = getChartData();
    
    if (!data.labels || data.labels.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No chart data</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Unable to generate chart from this data.
            </p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return <Bar ref={chartRef} data={data} options={getChartOptions()} />;
      case 'line':
        return <Line ref={chartRef} data={data} options={getChartOptions()} />;
      case 'pie':
        return <Pie ref={chartRef} data={data} options={getChartOptions()} />;
      default:
        return <Bar ref={chartRef} data={data} options={getChartOptions()} />;
    }
  };

  const handleExportPNG = () => {
    try {
      const chart = chartRef.current;
      if (!chart) return;
      const url = chart.toBase64Image('image/png', 1);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentFile?.originalName || 'chart'}-${chartType}.png`;
      link.click();
    } catch (e) {
      console.error('PNG export failed', e);
    }
  };

  const handleExportCSV = () => {
    const data = getChartData();
    if (!data?.labels || data.labels.length === 0 || !data.datasets?.[0]) return;
    const header = ['Label', data.datasets[0].label || 'Value'];
    const rows = data.labels.map((label, i) => [
      String(label).replaceAll('"', '""'),
      data.datasets[0].data?.[i] ?? ''
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentFile?.originalName || 'chart'}-${chartType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderStatistics = () => {
    if (!analytics?.statistics) return null;

    const { numericColumns, textColumns } = analytics.statistics;

    return (
      <div className="space-y-6">
        {/* Numeric Columns */}
        {numericColumns && Object.keys(numericColumns).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Numeric Analysis</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(numericColumns).map(([column, stats]) => (
                <div key={column} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{column}</h4>
                  <dl className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Count:</span>
                      <span>{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mean:</span>
                      <span>{stats.mean?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Median:</span>
                      <span>{stats.median?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min:</span>
                      <span>{stats.min}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max:</span>
                      <span>{stats.max}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Std Dev:</span>
                      <span>{stats.standardDeviation?.toFixed(2)}</span>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Columns */}
        {textColumns && Object.keys(textColumns).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Text Analysis</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(textColumns).map(([column, stats]) => (
                <div key={column} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{column}</h4>
                  <dl className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Count:</span>
                      <span>{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique:</span>
                      <span>{stats.uniqueCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Most Frequent:</span>
                      <span className="truncate max-w-20">{stats.mostFrequent}</span>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentFile) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">File not found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The file you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (currentFile.status !== 'completed') {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">File not ready</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This file is still being processed. Please check back later.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <Link
              to={`/file/${currentFile._id}`}
              className="mr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
                Analytics: {currentFile.originalName}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Data visualization and insights
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            onClick={() => setShowColumnSelector(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 mr-2"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Select Columns
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete File
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'charts', name: 'Charts', icon: CircleStackIcon },
            { id: '3d', name: '3D Visualization', icon: CubeIcon },
            { id: 'statistics', name: 'Statistics', icon: Square3Stack3DIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Insights */}
            {analytics?.insights && analytics.insights.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-4">Key Insights</h3>
                <ul className="space-y-2">
                  {analytics.insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-400 rounded-full mt-2"></div>
                      </div>
                      <p className="ml-3 text-sm text-blue-800 dark:text-blue-300">{insight}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Rows
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {currentFile.metadata?.totalRows?.toLocaleString() || 'N/A'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                                <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Square3Stack3DIcon className="h-6 w-6 text-green-400" />
                </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Columns
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {currentFile.metadata?.totalColumns || 'N/A'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Sheets
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {currentFile.metadata?.sheets?.length || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CubeIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Processed
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {analytics?.isProcessed ? 'Yes' : 'No'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Chart Type Selector */}
            <div className="flex space-x-4">
              {[
                { id: 'bar', name: 'Bar Chart', icon: ChartBarIcon },
                { id: 'line', name: 'Line Chart', icon: Square3Stack3DIcon },
                { id: 'pie', name: 'Pie Chart', icon: CircleStackIcon }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  className={`${
                    chartType === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  } inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <type.icon className="h-4 w-4 mr-2" />
                  {type.name}
                </button>
              ))}
            </div>

            {/* Chart + Export Controls */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex justify-end mb-3 space-x-2">
                <button onClick={handleExportPNG} className="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600">Export PNG</button>
                <button onClick={handleExportCSV} className="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600">Export CSV</button>
              </div>
              {/* Constrain chart height to prevent overflow */}
              <div className="relative h-80 md:h-96">
                <div className="absolute inset-0">
                  {renderChart()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === '3d' && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">3D Data Visualization</h3>
            <div className="h-96 rounded-lg overflow-hidden">
              <ThreeJSVisualization data={analytics?.chartData?.bar} />
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {renderStatistics()}
          </div>
        )}
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Select Columns for Chart
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    X-Axis (Labels)
                  </label>
                  <select
                    value={selectedXColumn}
                    onChange={(e) => setSelectedXColumn(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {getAvailableColumns().map((column, index) => (
                      <option key={index} value={index}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Y-Axis (Values)
                  </label>
                  <select
                    value={selectedYColumn}
                    onChange={(e) => setSelectedYColumn(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {getAvailableColumns().map((column, index) => (
                      <option key={index} value={index}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowColumnSelector(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomChartGeneration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Generate Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete File
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete "{currentFile?.originalName}"? This action cannot be undone and will remove the file and all its analytics data.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileDeletion}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
