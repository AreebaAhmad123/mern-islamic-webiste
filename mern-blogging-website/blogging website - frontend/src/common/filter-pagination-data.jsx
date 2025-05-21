import axios from "axios";
export const filterPaginationData = async ({
    create_new_arr = false,
    state,
    data,
    page,
    countRoute,
    data_to_send = {},
  }) => {
    try {
      if (state !== null && !create_new_arr) {
        return {
          ...state,
          results: [...state.results, ...data],
          page: page,
        };
      } else {
        const { data: countData } = await axios.post(
          import.meta.env.VITE_SERVER_DOMAIN + countRoute,
          data_to_send
        );
        return {
          results: data,
          page: 1,
          totalDocs: countData.totalDocs,
        };
      }
    } catch (err) {
      console.error('Error in filterPaginationData:', err);
      return null;
    }
  };