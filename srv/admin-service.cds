using { aidcm } from '../db/schema';

/* Admin's 4 CRUD screens: Business Sectors & Regions, Systems, Controls, System & Controls mapping */
service AdminService @(path: '/odata/v4/admin') {
  entity BusinessSectors     as projection on aidcm.BusinessSectors;
  entity Regions             as projection on aidcm.Regions;
  entity Systems             as projection on aidcm.Systems;
  entity Controls            as projection on aidcm.Controls;
  entity SystemControlMapping as projection on aidcm.SystemControlMapping;
}
