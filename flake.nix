{
  description = "knave-mail, a fast keyboard-driven email client";

  inputs = {
    knave.url = "github:knave-lang/knave/v0.17.0";
    nixpkgs.follows = "knave/nixpkgs";
    design-system = {
      url = "github:KarlHarnois/design-system";
      inputs.knave.follows = "knave";
    };
  };

  outputs =
    {
      knave,
      nixpkgs,
      design-system,
      ...
    }:
    {
      devShells = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ] (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          webviewLibraries = [
            pkgs.gtk3
            pkgs.webkitgtk_4_1
            pkgs.libsoup_3
            pkgs.glib
            pkgs.dbus
            pkgs.cairo
            pkgs.pango
            pkgs.gdk-pixbuf
            pkgs.atk
            pkgs.harfbuzz
            pkgs.openssl
          ];
        in
        {
          default = pkgs.mkShell {
            packages = [
              knave.packages.${system}.default
              pkgs.cargo
              pkgs.pkg-config
              pkgs.bun
              pkgs.xvfb-run
            ]
            ++ webviewLibraries;
            DESIGN_SYSTEM = design-system.packages.${system}.default;
            LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath webviewLibraries;
          };
        }
      );
    };
}
