const LoadMoreDataBtn = ({ state, fetchDataFun, additionalParam }) => {
    if (
        state &&
        typeof state.totalDocs === 'number' &&
        Array.isArray(state.results) &&
        state.totalDocs > state.results.length
    ) {
        return (
            <button
                onClick={() => fetchDataFun(...(additionalParam ? [additionalParam] : []), state.page + 1)}
                className="bg-purple-600 text-white p-2 px-4 rounded-md flex items-center gap-2 font-semibold shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors duration-150"
            >
                Load More
            </button>
        );
    }
    return null;
};

export default LoadMoreDataBtn;
