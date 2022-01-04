module.exports = {
  validateEmail(email) {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  },

  validatePassword(password) {
    return String(password).match(
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[_#?!@$%^&*-]).{8,}$/
    );
  },

  validatePin(pin) {
    return String(pin).match(/^[0-9]+$/);
  },

  validateImageUrl(url) {
    return String(url).match(/(https?:\/\/.*\.(?:png|jpg))/);
  },

  validateMongodbId(id) {
    return String(id).match(/^[a-f\d]{24}$/i);
  },

  //Only allow select characters to be allowed
  validateRegularText(text) {
    return String(text).match(/^[a-z A-Z0-9.:-]+$/);
  },
};
