const dev = process.env.REACT_APP_DEV;
const url =
  dev === "TRUE"
    ? process.env.REACT_APP_DEV_URL
    : process.env.REACT_APP_PROD_URL;

export default url;
